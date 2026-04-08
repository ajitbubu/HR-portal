"""
Microsoft 365 SSO endpoints (Azure AD OAuth2 Authorization Code Flow).

Flow:
  GET /api/auth/microsoft/login
      → redirects browser to Azure AD authorize URL

  GET /api/auth/microsoft/callback?code=...
      → exchanges code for tokens via MSAL
      → extracts email from id_token claims
      → email found + active  → issue internal JWT → redirect to /login?ms_token=<jwt>
      → email not found / inactive → redirect to /login?ms_error=not_provisioned
"""

import logging

import msal
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.services.audit_service import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

_SCOPES = ["openid", "email", "profile"]


def _msal_app() -> msal.ConfidentialClientApplication:
    """Create a fresh MSAL app per request (not thread-safe to share across workers)."""
    return msal.ConfidentialClientApplication(
        client_id=settings.AZURE_CLIENT_ID,
        client_credential=settings.AZURE_CLIENT_SECRET,
        authority=f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}",
    )


@router.get("/microsoft/login")
def microsoft_login():
    """Redirect the browser to Azure AD's authorization endpoint."""
    if not settings.AZURE_CLIENT_ID:
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=sso_not_configured"
        )
    auth_url = _msal_app().get_authorization_request_url(
        scopes=_SCOPES,
        redirect_uri=settings.AZURE_REDIRECT_URI,
        state="hr_portal_sso",
    )
    return RedirectResponse(url=auth_url)


@router.get("/microsoft/callback")
def microsoft_callback(
    code: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Azure AD redirects here after authentication.
    Exchanges the code for tokens, looks up the user, and issues an internal JWT.
    """
    if error:
        logger.warning("Azure AD returned error: %s — %s", error, error_description)
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=auth_failed"
        )

    if not code:
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=not_provisioned"
        )

    # Exchange authorization code for tokens
    try:
        result = _msal_app().acquire_token_by_authorization_code(
            code=code,
            scopes=_SCOPES,
            redirect_uri=settings.AZURE_REDIRECT_URI,
        )
    except Exception:
        logger.exception("MSAL token exchange failed")
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=token_exchange_failed"
        )

    if "error" in result:
        logger.warning(
            "MSAL acquire_token error: %s — %s",
            result.get("error"),
            result.get("error_description"),
        )
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=token_exchange_failed"
        )

    # Extract email from id_token claims
    # preferred_username is the UPN in M365 tenants and is usually an email address
    claims = result.get("id_token_claims", {})
    email = (
        claims.get("email")
        or claims.get("preferred_username")
        or claims.get("upn")
        or ""
    ).strip().lower()

    if not email:
        logger.warning(
            "Could not extract email from Azure AD claims. Available claims: %s",
            list(claims.keys()),
        )
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=no_email_claim"
        )

    # Match against a pre-provisioned active user
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active:
        logger.info("SSO login rejected — no active account for email: %s", email)
        return RedirectResponse(
            url=f"{settings.APP_BASE_URL}/login?ms_error=not_provisioned"
        )

    # Issue the same internal JWT used by password login
    token = create_access_token({"sub": str(user.id), "role": user.role})

    log_audit(db, user.id, "login_sso_microsoft", "user", user.id)

    return RedirectResponse(
        url=f"{settings.APP_BASE_URL}/login?ms_token={token}"
    )
