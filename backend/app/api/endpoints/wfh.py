"""Work From Home endpoints."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, and_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.wfh import WFHRequest, WFHPolicy
from app.models.leave import LeaveRequest
from app.schemas.wfh import (
    WFHApplyRequest, WFHActionRequest, WFHRequestResponse,
    WFHPolicyResponse, WFHSummaryResponse,
)
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit

router = APIRouter(prefix="/wfh", tags=["Work From Home"])


def _to_response(r: WFHRequest, db: Session) -> WFHRequestResponse:
    emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
    approver = db.query(Employee).filter(Employee.id == r.approved_by).first() if r.approved_by else None
    return WFHRequestResponse(
        id=r.id,
        employee_id=r.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        department=emp.department.name if emp and emp.department else None,
        request_date=r.request_date,
        end_date=r.end_date,
        wfh_type=r.wfh_type,
        total_days=r.total_days,
        reason=r.reason,
        status=r.status,
        approved_by=r.approved_by,
        approver_name=f"{approver.first_name} {approver.last_name}" if approver else None,
        approver_comments=r.approver_comments,
        created_at=r.created_at,
    )


def _count_wfh_days(db: Session, employee_id: int, start: date, end: date) -> int:
    """Count approved + pending WFH days in a date range."""
    requests = db.query(WFHRequest).filter(
        WFHRequest.employee_id == employee_id,
        WFHRequest.status.in_(["approved", "pending"]),
        WFHRequest.request_date >= start,
        WFHRequest.request_date <= end,
    ).all()
    total = 0
    for r in requests:
        rd_end = r.end_date or r.request_date
        # Count days that overlap with the range
        overlap_start = max(r.request_date, start)
        overlap_end = min(rd_end, end)
        if overlap_start <= overlap_end:
            total += (overlap_end - overlap_start).days + 1
    return total


@router.post("/apply", response_model=WFHRequestResponse)
def apply_wfh(
    req: WFHApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # Check for overlap with leave
    end = req.end_date or req.request_date
    overlapping_leave = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == emp.id,
        LeaveRequest.status.in_(["pending", "approved"]),
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= req.request_date,
    ).first()
    if overlapping_leave:
        raise HTTPException(
            status_code=400,
            detail="You have an overlapping leave request for this date. WFH cannot be combined with leave.",
        )

    # Check weekly/monthly limits
    policy = db.query(WFHPolicy).filter(WFHPolicy.is_active == True).first()
    if policy:
        # Monthly check
        month_start = req.request_date.replace(day=1)
        if req.request_date.month == 12:
            month_end = req.request_date.replace(year=req.request_date.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = req.request_date.replace(month=req.request_date.month + 1, day=1) - timedelta(days=1)
        monthly_count = _count_wfh_days(db, emp.id, month_start, month_end)
        new_days = (end - req.request_date).days + 1
        if monthly_count + new_days > policy.max_days_per_month:
            raise HTTPException(
                status_code=400,
                detail=f"This would exceed your monthly WFH limit ({policy.max_days_per_month} days). "
                       f"You have already used {monthly_count} days this month.",
            )

        # Probation check
        if policy.min_probation_months and emp.joining_date:
            from dateutil.relativedelta import relativedelta
            probation_end = emp.joining_date + relativedelta(months=policy.min_probation_months)
            if req.request_date < probation_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"WFH is available after completing {policy.min_probation_months} months of probation. "
                           f"You are eligible from {probation_end}.",
                )

    wfh = WFHRequest(
        employee_id=emp.id,
        request_date=req.request_date,
        end_date=req.end_date,
        wfh_type=req.wfh_type,
        reason=req.reason,
        status="pending",
    )
    db.add(wfh)
    db.flush()

    # Notify manager
    if emp.manager_id:
        mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if mgr and mgr.user_id:
            create_notification(
                db, mgr.user_id,
                "New WFH Request",
                f"{emp.first_name} {emp.last_name} has requested WFH for {req.request_date}"
                + (f" to {req.end_date}" if req.end_date and req.end_date != req.request_date else ""),
                type="approval",
                link="/wfh/approvals",
            )

    log_audit(db, current_user.id, "create", "wfh_request", wfh.id)
    db.commit()
    db.refresh(wfh)
    return _to_response(wfh, db)


@router.get("/my-requests", response_model=list[WFHRequestResponse])
def my_wfh_requests(
    month: int | None = None,
    year: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    q = db.query(WFHRequest).filter(WFHRequest.employee_id == emp.id)
    if month:
        q = q.filter(extract("month", WFHRequest.request_date) == month)
    if year:
        q = q.filter(extract("year", WFHRequest.request_date) == year)
    if status:
        q = q.filter(WFHRequest.status == status)

    return [_to_response(r, db) for r in q.order_by(WFHRequest.request_date.desc()).all()]


@router.get("/summary", response_model=WFHSummaryResponse)
def wfh_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    today = date.today()
    policy = db.query(WFHPolicy).filter(WFHPolicy.is_active == True).first()
    max_week = policy.max_days_per_week if policy else 2
    max_month = policy.max_days_per_month if policy else 8

    # This month
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    monthly = _count_wfh_days(db, emp.id, month_start, month_end)

    # This week
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    weekly = _count_wfh_days(db, emp.id, week_start, week_end)

    return WFHSummaryResponse(
        total_this_month=monthly,
        total_this_week=weekly,
        max_per_month=max_month,
        max_per_week=max_week,
        remaining_this_month=max(0, max_month - monthly),
        remaining_this_week=max(0, max_week - weekly),
    )


@router.get("/team", response_model=list[WFHRequestResponse])
def team_wfh(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get WFH requests for the manager's team."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    team_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
    if not team_ids:
        return []

    q = db.query(WFHRequest).filter(WFHRequest.employee_id.in_(team_ids))
    if month:
        q = q.filter(extract("month", WFHRequest.request_date) == month)
    if year:
        q = q.filter(extract("year", WFHRequest.request_date) == year)

    return [_to_response(r, db) for r in q.order_by(WFHRequest.request_date.desc()).all()]


@router.get("/pending-approvals", response_model=list[WFHRequestResponse])
def pending_wfh_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pending WFH requests for the current manager."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    team_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
    requests = db.query(WFHRequest).filter(
        WFHRequest.employee_id.in_(team_ids),
        WFHRequest.status == "pending",
    ).order_by(WFHRequest.created_at.asc()).all()

    return [_to_response(r, db) for r in requests]


@router.post("/{request_id}/approve", response_model=WFHRequestResponse)
def approve_wfh(
    request_id: int,
    action: WFHActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    wfh = db.query(WFHRequest).filter(WFHRequest.id == request_id).first()
    if not wfh:
        raise HTTPException(status_code=404, detail="WFH request not found")
    if wfh.status != "pending":
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    wfh.status = "approved"
    wfh.approved_by = emp.id
    wfh.approved_at = datetime.now(timezone.utc)
    wfh.approver_comments = action.comments

    # Notify employee
    req_emp = db.query(Employee).filter(Employee.id == wfh.employee_id).first()
    if req_emp and req_emp.user_id:
        create_notification(
            db, req_emp.user_id,
            "WFH Request Approved",
            f"Your WFH request for {wfh.request_date} has been approved.",
            type="info",
            link="/wfh",
        )

    log_audit(db, current_user.id, "approve", "wfh_request", wfh.id)
    db.commit()
    db.refresh(wfh)
    return _to_response(wfh, db)


@router.post("/{request_id}/reject", response_model=WFHRequestResponse)
def reject_wfh(
    request_id: int,
    action: WFHActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    wfh = db.query(WFHRequest).filter(WFHRequest.id == request_id).first()
    if not wfh:
        raise HTTPException(status_code=404, detail="WFH request not found")
    if wfh.status != "pending":
        raise HTTPException(status_code=400, detail="Request is no longer pending")

    wfh.status = "rejected"
    wfh.approved_by = emp.id
    wfh.approved_at = datetime.now(timezone.utc)
    wfh.approver_comments = action.comments

    req_emp = db.query(Employee).filter(Employee.id == wfh.employee_id).first()
    if req_emp and req_emp.user_id:
        create_notification(
            db, req_emp.user_id,
            "WFH Request Rejected",
            f"Your WFH request for {wfh.request_date} has been rejected."
            + (f" Reason: {action.comments}" if action.comments else ""),
            type="info",
            link="/wfh",
        )

    log_audit(db, current_user.id, "reject", "wfh_request", wfh.id)
    db.commit()
    db.refresh(wfh)
    return _to_response(wfh, db)


@router.post("/{request_id}/cancel")
def cancel_wfh(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    wfh = db.query(WFHRequest).filter(
        WFHRequest.id == request_id,
        WFHRequest.employee_id == emp.id,
    ).first()
    if not wfh:
        raise HTTPException(status_code=404, detail="WFH request not found")
    if wfh.status not in ("pending",):
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")

    wfh.status = "cancelled"
    log_audit(db, current_user.id, "cancel", "wfh_request", wfh.id)
    db.commit()
    return {"message": "WFH request cancelled"}


@router.get("/policy", response_model=WFHPolicyResponse | None)
def get_wfh_policy(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(WFHPolicy).filter(WFHPolicy.is_active == True).first()
