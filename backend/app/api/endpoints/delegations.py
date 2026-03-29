"""Delegation API — managers can set an out-of-office delegate."""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.misc import DelegationSetting
from app.services.notification_service import create_notification

router = APIRouter(prefix="/delegations", tags=["Delegations"])


class DelegationCreate(BaseModel):
    delegate_id: int
    start_date: date
    end_date: date
    reason: str | None = None


class DelegationResponse(BaseModel):
    id: int
    delegator_id: int
    delegator_name: str | None = None
    delegate_id: int
    delegate_name: str | None = None
    start_date: date
    end_date: date
    reason: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/my", response_model=list[DelegationResponse])
def get_my_delegations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all delegations set by the current user."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    delegations = db.query(DelegationSetting).filter(
        DelegationSetting.delegator_id == emp.id
    ).order_by(DelegationSetting.start_date.desc()).all()
    return [_to_response(d) for d in delegations]


@router.get("/active", response_model=DelegationResponse | None)
def get_active_delegation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently active delegation for the logged-in user (if any)."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return None
    today = date.today()
    d = db.query(DelegationSetting).filter(
        DelegationSetting.delegator_id == emp.id,
        DelegationSetting.is_active == True,
        DelegationSetting.start_date <= today,
        DelegationSetting.end_date >= today,
    ).first()
    return _to_response(d) if d else None


@router.post("", response_model=DelegationResponse)
def create_delegation(
    req: DelegationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new out-of-office delegation."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    if req.delegate_id == emp.id:
        raise HTTPException(status_code=400, detail="Cannot delegate to yourself")

    delegate = db.query(Employee).filter(Employee.id == req.delegate_id).first()
    if not delegate:
        raise HTTPException(status_code=404, detail="Delegate employee not found")

    if req.end_date < req.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Deactivate any overlapping active delegations
    existing = db.query(DelegationSetting).filter(
        DelegationSetting.delegator_id == emp.id,
        DelegationSetting.is_active == True,
    ).all()
    for ex in existing:
        ex.is_active = False

    delegation = DelegationSetting(
        delegator_id=emp.id,
        delegate_id=req.delegate_id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        is_active=True,
    )
    db.add(delegation)
    db.flush()

    # Notify the delegate
    if delegate.user_id:
        create_notification(
            db, delegate.user_id,
            "You've been assigned as a delegate approver",
            f"{emp.first_name} {emp.last_name} has delegated their approvals to you "
            f"from {req.start_date} to {req.end_date}. "
            f"{'Reason: ' + req.reason if req.reason else ''}",
            type="approval",
            link="/approvals",
        )

    db.commit()
    db.refresh(delegation)
    return _to_response(delegation)


@router.delete("/{delegation_id}")
def cancel_delegation(
    delegation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel / deactivate a delegation."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    d = db.query(DelegationSetting).filter(
        DelegationSetting.id == delegation_id,
        DelegationSetting.delegator_id == emp.id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delegation not found")
    d.is_active = False
    db.commit()
    return {"message": "Delegation cancelled"}


@router.get("/delegated-to-me", response_model=list[DelegationResponse])
def delegated_to_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """See active delegations where the current user is the delegate."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    today = date.today()
    delegations = db.query(DelegationSetting).filter(
        DelegationSetting.delegate_id == emp.id,
        DelegationSetting.is_active == True,
        DelegationSetting.start_date <= today,
        DelegationSetting.end_date >= today,
    ).all()
    return [_to_response(d) for d in delegations]


def _to_response(d: DelegationSetting) -> DelegationResponse:
    delegator_name = f"{d.delegator.first_name} {d.delegator.last_name}" if d.delegator else None
    delegate_name  = f"{d.delegate.first_name} {d.delegate.last_name}"  if d.delegate  else None
    return DelegationResponse(
        id=d.id,
        delegator_id=d.delegator_id,
        delegator_name=delegator_name,
        delegate_id=d.delegate_id,
        delegate_name=delegate_name,
        start_date=d.start_date,
        end_date=d.end_date,
        reason=d.reason,
        is_active=d.is_active,
    )
