"""Email service for HR Portal notifications."""
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


async def _get_mail_connection():
    """Get FastMail connection if email is enabled."""
    if not settings.MAIL_ENABLED:
        return None
    try:
        from fastapi_mail import FastMail, ConnectionConfig, MessageSchema, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        return FastMail(conf)
    except Exception as e:
        logger.warning(f"Email configuration error: {e}")
        return None


async def send_email(
    to_email: str,
    subject: str,
    body_html: str,
):
    """Send an email. Silently skips if email is not configured."""
    fm = await _get_mail_connection()
    if not fm:
        logger.info(f"Email disabled - would send to {to_email}: {subject}")
        return False
    try:
        from fastapi_mail import MessageSchema, MessageType

        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            body=body_html,
            subtype=MessageType.html,
        )
        await fm.send_message(message)
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def generate_approval_token(leave_request_id: int, approver_id: int, action: str) -> str:
    """Generate a secure token for email-based approval actions."""
    from datetime import datetime, timedelta, timezone
    from jose import jwt

    payload = {
        "leave_request_id": leave_request_id,
        "approver_id": approver_id,
        "action": action,
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "type": "approval_action",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_approval_token(token: str) -> Optional[dict]:
    """Verify and decode an approval action token."""
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "approval_action":
            return None
        return payload
    except JWTError:
        return None


def build_leave_notification_html(
    employee_name: str,
    leave_type: str,
    start_date: str,
    end_date: str,
    total_days: float,
    reason: str,
    status: str,
    approver_name: str = "",
    approve_url: str = "",
    reject_url: str = "",
) -> str:
    """Build HTML email body for leave notifications."""
    status_colors = {
        "pending": "#f59e0b",
        "approved": "#10b981",
        "rejected": "#ef4444",
        "cancelled": "#6b7280",
    }
    color = status_colors.get(status, "#6b7280")

    action_buttons = ""
    if approve_url and reject_url:
        action_buttons = f"""
        <div style="margin: 24px 0; text-align: center;">
            <a href="{approve_url}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600;">Approve</a>
            <a href="{reject_url}" style="display: inline-block; padding: 12px 32px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px; font-weight: 600;">Reject</a>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center;">Or <a href="{settings.APP_BASE_URL}/approvals">open the portal</a> for more options.</p>
        """

    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">DataSafeguard HR</h2>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="color: #1f2937; margin-top: 0;">Leave Request — <span style="color: {color}; text-transform: uppercase;">{status}</span></h3>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Employee</td><td style="padding: 8px 0; font-weight: 600;">{employee_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Leave Type</td><td style="padding: 8px 0;">{leave_type}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Dates</td><td style="padding: 8px 0;">{start_date} — {end_date} ({total_days} day(s))</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Reason</td><td style="padding: 8px 0;">{reason or 'N/A'}</td></tr>
                {"<tr><td style='padding: 8px 0; color: #6b7280;'>Actioned by</td><td style='padding: 8px 0;'>" + approver_name + "</td></tr>" if approver_name else ""}
            </table>
            {action_buttons}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification from the DataSafeguard HR Portal.</p>
        </div>
    </div>
    """


def build_reminder_html(
    approver_name: str,
    pending_count: int,
    requests_summary: list[dict],
) -> str:
    """Build HTML email for pending approval reminders."""
    rows = ""
    for r in requests_summary[:10]:
        rows += f"""<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{r['employee_name']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{r['leave_type']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{r['dates']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{r['days_pending']} day(s)</td>
        </tr>"""

    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">DataSafeguard HR — Reminder</h2>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hi {approver_name},</p>
            <p>You have <strong>{pending_count}</strong> leave request(s) awaiting your action:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 8px; text-align: left;">Employee</th>
                        <th style="padding: 8px; text-align: left;">Type</th>
                        <th style="padding: 8px; text-align: left;">Dates</th>
                        <th style="padding: 8px; text-align: left;">Pending</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
            <div style="text-align: center; margin: 24px 0;">
                <a href="{settings.APP_BASE_URL}/approvals" style="display: inline-block; padding: 12px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Requests</a>
            </div>
        </div>
    </div>
    """
