from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.resignation import ResignationRequest, ResignationActionLog
from app.schemas.resignation import (
    ResignationSubmitRequest,
    ManagerActionRequest,
    HRNotesRequest,
    NoticePeriodPreview,
    ResignationResponse,
)
from app.services.resignation_service import (
    get_notice_period_config,
    calculate_last_working_day,
    maybe_auto_approve,
    mark_completed,
)
from app.services.notification_service import create_notification, notify_hr_admins
from app.services.audit_service import log_audit

router = APIRouter(prefix="/resignation", tags=["Resignation"])

TERMINAL_STATUSES = {"withdrawn", "completed", "rejected"}


def _build_response(r: ResignationRequest) -> dict:
    """Serialize a ResignationRequest ORM object with denormalized display fields."""
    emp = r.employee
    mgr = r.manager

    emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
    emp_code = emp.employee_id if emp else None
    mgr_name = f"{mgr.first_name} {mgr.last_name}" if mgr else None
    dept_name = emp.department.name if emp and emp.department else None
    loc_name = None
    country = None
    if emp and emp.location:
        loc_name = emp.location.name
        country = emp.location.country

    return dict(
        id=r.id,
        employee_id=r.employee_id,
        employee_name=emp_name,
        employee_code=emp_code,
        manager_name=mgr_name,
        department_name=dept_name,
        location_name=loc_name,
        country=country,
        resignation_date=r.resignation_date,
        notice_period_days=r.notice_period_days,
        is_mandatory=r.is_mandatory,
        is_india_based=r.is_india_based,
        expected_last_day=r.expected_last_day,
        actual_last_day=r.actual_last_day,
        reason=r.reason,
        status=r.status,
        manager_action=r.manager_action,
        manager_action_date=r.manager_action_date,
        manager_comments=r.manager_comments,
        hr_notes=r.hr_notes,
        created_at=r.created_at,
        updated_at=r.updated_at,
        action_logs=r.action_logs,
    )


@router.get("/notice-period-preview", response_model=NoticePeriodPreview)
def notice_period_preview(
    resignation_date: Optional[str] = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the notice period config and expected last day for the current user."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee record not found")

    res_date = date.fromisoformat(resignation_date) if resignation_date else date.today()
    days, is_mandatory, is_india = get_notice_period_config(emp, db)
    last_day = calculate_last_working_day(res_date, days)

    return NoticePeriodPreview(
        notice_period_days=days,
        is_mandatory=is_mandatory,
        is_india_based=is_india,
        resignation_date=res_date,
        expected_last_day=last_day,
    )


@router.post("/submit", response_model=ResignationResponse)
def submit_resignation(
    req: ResignationSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee record not found")

    # Block if there's already an active (non-terminal) resignation
    existing = db.query(ResignationRequest).filter(
        ResignationRequest.employee_id == emp.id,
        ResignationRequest.status.notin_(list(TERMINAL_STATUSES)),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an active resignation request. Withdraw it before submitting a new one.",
        )

    res_date = req.resignation_date or date.today()
    days, is_mandatory, is_india = get_notice_period_config(emp, db)
    last_day = calculate_last_working_day(res_date, days)

    resignation = ResignationRequest(
        employee_id=emp.id,
        resignation_date=res_date,
        notice_period_days=days,
        is_mandatory=is_mandatory,
        is_india_based=is_india,
        expected_last_day=last_day,
        reason=req.reason,
        status="pending",
        manager_id=emp.manager_id,
    )
    db.add(resignation)
    db.flush()

    db.add(ResignationActionLog(
        resignation_id=resignation.id,
        actor_id=current_user.id,
        action="submitted",
        new_status="pending",
    ))

    # Notify direct manager
    if emp.manager_id:
        mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if mgr and mgr.user_id:
            create_notification(
                db,
                mgr.user_id,
                "Resignation Submitted",
                f"{emp.first_name} {emp.last_name} has submitted their resignation. Last day: {last_day}.",
                type="approval",
                link="/resignation",
            )

    # Notify HR admins
    notify_hr_admins(
        db,
        "Employee Resignation Submitted",
        f"{emp.first_name} {emp.last_name} ({emp.employee_id}) has submitted their resignation. "
        f"Notice period: {days} days {'(mandatory)' if is_mandatory else '(flexible)'}. "
        f"Expected last day: {last_day}.",
        type="info",
        link="/resignation",
    )

    log_audit(db, current_user.id, "create", "resignation_request", resignation.id)
    db.commit()
    db.refresh(resignation)
    return _build_response(resignation)


@router.get("/my", response_model=list[ResignationResponse])
def get_my_resignations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    resignations = db.query(ResignationRequest).filter(
        ResignationRequest.employee_id == emp.id
    ).order_by(ResignationRequest.created_at.desc()).all()

    for r in resignations:
        maybe_auto_approve(db, r)

    return [_build_response(r) for r in resignations]


@router.get("/team", response_model=list[ResignationResponse])
def get_team_resignations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("super_admin", "hr_admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    # Get IDs of direct reports
    subordinate_ids = [s.id for s in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
    if not subordinate_ids:
        return []

    resignations = db.query(ResignationRequest).filter(
        ResignationRequest.employee_id.in_(subordinate_ids)
    ).order_by(ResignationRequest.created_at.desc()).all()

    for r in resignations:
        maybe_auto_approve(db, r)

    return [_build_response(r) for r in resignations]


@router.get("/all", response_model=list[ResignationResponse])
def get_all_resignations(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    department_id: Optional[int] = None,
    is_india_based: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    q = db.query(ResignationRequest)
    if status_filter:
        q = q.filter(ResignationRequest.status == status_filter)
    if is_india_based is not None:
        q = q.filter(ResignationRequest.is_india_based == is_india_based)
    if department_id:
        q = q.join(Employee, ResignationRequest.employee_id == Employee.id).filter(
            Employee.department_id == department_id
        )

    resignations = q.order_by(ResignationRequest.created_at.desc()).offset(skip).limit(limit).all()

    for r in resignations:
        maybe_auto_approve(db, r)

    return [_build_response(r) for r in resignations]


@router.get("/{resignation_id}", response_model=ResignationResponse)
def get_resignation(
    resignation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(ResignationRequest).filter(ResignationRequest.id == resignation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resignation not found")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    is_owner = emp and r.employee_id == emp.id
    is_manager = emp and r.manager_id == emp.id
    is_hr = current_user.role in ("super_admin", "hr_admin")

    if not (is_owner or is_manager or is_hr):
        raise HTTPException(status_code=403, detail="Access denied")

    maybe_auto_approve(db, r)
    return _build_response(r)


@router.post("/{resignation_id}/manager-action", response_model=ResignationResponse)
def manager_action(
    resignation_id: int,
    req: ManagerActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(ResignationRequest).filter(ResignationRequest.id == resignation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resignation not found")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    is_manager_of_record = emp and r.manager_id == emp.id
    is_hr = current_user.role in ("super_admin", "hr_admin")

    if not (is_manager_of_record or is_hr):
        raise HTTPException(status_code=403, detail="Only the designated manager or HR can act on this resignation")

    if r.status not in ("pending",):
        raise HTTPException(status_code=400, detail=f"Cannot act on a resignation with status '{r.status}'")

    action = req.action
    old_status = r.status

    if action == "approve":
        r.status = "approved"
        r.manager_action = "approved"
        r.actual_last_day = r.expected_last_day

    elif action == "reject":
        if r.is_mandatory:
            raise HTTPException(
                status_code=400,
                detail="Resignation cannot be rejected for India-based employees. The notice period is mandatory.",
            )
        r.status = "rejected"
        r.manager_action = "rejected"

    elif action == "modify_last_day":
        if not req.new_last_day:
            raise HTTPException(status_code=400, detail="new_last_day is required for modify_last_day action")
        if r.is_mandatory and req.new_last_day < r.expected_last_day:
            raise HTTPException(
                status_code=400,
                detail=f"For India-based employees, last day cannot be earlier than {r.expected_last_day}",
            )
        if req.new_last_day < date.today():
            raise HTTPException(status_code=400, detail="New last day cannot be in the past")
        r.status = "approved"
        r.manager_action = "modified"
        r.actual_last_day = req.new_last_day

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action '{action}'")

    r.manager_action_date = datetime.now(timezone.utc)
    r.manager_comments = req.comments
    r.updated_at = datetime.now(timezone.utc)

    db.add(ResignationActionLog(
        resignation_id=r.id,
        actor_id=current_user.id,
        action=action if action != "modify_last_day" else "modified_last_day",
        comments=req.comments,
        old_status=old_status,
        new_status=r.status,
    ))

    # Notify employee
    resigning_emp = r.employee
    if resigning_emp and resigning_emp.user_id:
        if action == "approve" or action == "modify_last_day":
            create_notification(
                db,
                resigning_emp.user_id,
                "Resignation Approved",
                f"Your resignation has been approved. Your last working day is confirmed as {r.actual_last_day}."
                + (f" (Modified from {r.expected_last_day})" if action == "modify_last_day" else ""),
                type="info",
                link="/resignation",
            )
        elif action == "reject":
            create_notification(
                db,
                resigning_emp.user_id,
                "Resignation Not Accepted",
                "Your resignation request was not accepted by your manager. Please contact HR for further clarification.",
                type="info",
                link="/resignation",
            )

    log_audit(db, current_user.id, action, "resignation_request", r.id)
    db.commit()
    db.refresh(r)
    return _build_response(r)


@router.post("/{resignation_id}/withdraw", response_model=ResignationResponse)
def withdraw_resignation(
    resignation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = db.query(ResignationRequest).filter(ResignationRequest.id == resignation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resignation not found")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp or r.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="You can only withdraw your own resignation")

    if r.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot withdraw a resignation with status '{r.status}'")

    old_status = r.status
    r.status = "withdrawn"
    r.updated_at = datetime.now(timezone.utc)

    db.add(ResignationActionLog(
        resignation_id=r.id,
        actor_id=current_user.id,
        action="withdrawn",
        old_status=old_status,
        new_status="withdrawn",
    ))

    # Notify manager
    if r.manager_id:
        mgr = db.query(Employee).filter(Employee.id == r.manager_id).first()
        if mgr and mgr.user_id:
            create_notification(
                db,
                mgr.user_id,
                "Resignation Withdrawn",
                f"{emp.first_name} {emp.last_name} has withdrawn their resignation.",
                type="info",
                link="/resignation",
            )

    log_audit(db, current_user.id, "withdraw", "resignation_request", r.id)
    db.commit()
    db.refresh(r)
    return _build_response(r)


@router.post("/{resignation_id}/hr-notes", response_model=ResignationResponse)
def add_hr_notes(
    resignation_id: int,
    req: HRNotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    r = db.query(ResignationRequest).filter(ResignationRequest.id == resignation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resignation not found")

    r.hr_notes = req.hr_notes
    r.updated_at = datetime.now(timezone.utc)

    db.add(ResignationActionLog(
        resignation_id=r.id,
        actor_id=current_user.id,
        action="hr_note_added",
        comments=req.hr_notes[:200],
        old_status=r.status,
        new_status=r.status,
    ))

    db.commit()
    db.refresh(r)
    return _build_response(r)


@router.post("/{resignation_id}/complete", response_model=ResignationResponse)
def complete_resignation(
    resignation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    r = db.query(ResignationRequest).filter(ResignationRequest.id == resignation_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resignation not found")

    if r.status not in ("approved", "auto_approved"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete a resignation with status '{r.status}'. Must be approved or auto_approved first.",
        )

    mark_completed(db, r, current_user.id)
    return _build_response(r)
