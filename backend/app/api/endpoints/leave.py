import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, LeaveApproval
from app.schemas.leave import (
    LeaveApplyRequest, LeaveRequestResponse, LeaveBalanceResponse,
    LeaveBalanceCheckResponse, LeaveTypeResponse, LeaveApprovalResponse,
    CompOffRequest, CompOffActionRequest, CompOffGrantResponse,
    FirstApproverConfigResponse, EligibleApproverItem,
)
from app.services.leave_service import (
    calculate_leave_days, check_leave_balance, update_leave_balance_on_apply,
    update_leave_balance_on_reject,
)
from app.services.approval_service import create_approval_chain, resolve_first_approver_from_policy
from app.services.audit_service import log_audit
from app.services.notification_service import create_notification, notify_leave_chain

router = APIRouter(prefix="/leave", tags=["Leave Management"])

ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/gif"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload-attachment")
async def upload_leave_attachment(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a medical certificate or other leave attachment. Returns the stored file path."""
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PDF and image files are allowed (PDF, JPG, PNG).")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "leave-attachments")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "upload")[1] or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    return {"path": file_path, "original_name": file.filename}


@router.get("/types", response_model=list[LeaveTypeResponse])
def get_leave_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(LeaveType).filter(LeaveType.is_active == True).all()
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if emp and (emp.gender or "").lower() == "male":
        types = [lt for lt in types if lt.code != "ML"]
    return types


@router.post("/apply", response_model=LeaveRequestResponse)
def apply_leave(
    req: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # ── Policy validations ──
    leave_type = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")

    # 7-day advance notice for Earned Leave
    from datetime import date as _date
    days_until_start = (req.start_date - _date.today()).days
    if leave_type.min_days_notice and days_until_start < leave_type.min_days_notice:
        if not getattr(req, 'is_emergency', False):
            raise HTTPException(
                status_code=400,
                detail=f"{leave_type.name} requires at least {leave_type.min_days_notice} days advance notice. "
                       f"You are applying {days_until_start} day(s) in advance.",
            )

    # Medical certificate required for Sick Leave > 2 consecutive days
    if leave_type.code == "SL":
        total_calendar_days = (req.end_date - req.start_date).days + 1
        if total_calendar_days > 2 and not req.attachment_path:
            raise HTTPException(
                status_code=400,
                detail="Medical certificate is required for sick leave exceeding 2 consecutive days. Please upload a document.",
            )

    # Check if employee is in notice period (resignation)
    from app.models.resignation import ResignationRequest
    active_resignation = db.query(ResignationRequest).filter(
        ResignationRequest.employee_id == emp.id,
        ResignationRequest.status.in_(["pending", "approved"]),
    ).first()
    if active_resignation:
        raise HTTPException(
            status_code=400,
            detail="Leave requests are restricted during the notice period. Please contact HR for exceptions.",
        )

    # Maternity leave: not available for male employees
    if leave_type.code == "ML" and (emp.gender or "").lower() == "male":
        raise HTTPException(
            status_code=400,
            detail="Maternity leave is not applicable for male employees.",
        )

    # Maternity leave eligibility: 6-month service + child count distinction
    if leave_type.code == "ML":
        from datetime import date as _dt
        if emp.joining_date:
            jd = emp.joining_date
            if hasattr(jd, "date"):
                jd = jd.date()
            months_of_service = (_dt.today().year - jd.year) * 12 + (_dt.today().month - jd.month)
            if months_of_service < 6:
                raise HTTPException(
                    status_code=400,
                    detail="Maternity leave requires at least 6 months of service.",
                )
        # Child count check: 26 weeks for first 2 children, 12 weeks for 3rd+
        # Uses number_of_children field on employee (defaults to 0 if not set)
        children = getattr(emp, "number_of_children", None) or 0
        max_days = 182 if children < 2 else 84  # 26 weeks vs 12 weeks
        total_calendar = (req.end_date - req.start_date).days + 1
        if total_calendar > max_days:
            raise HTTPException(
                status_code=400,
                detail=f"Maternity leave for {'3rd+ child' if children >= 2 else 'first 2 children'} is capped at {max_days} days ({max_days // 7} weeks).",
            )

    # Check for overlap with WFH
    from app.models.wfh import WFHRequest as WFHReq
    overlapping_wfh = db.query(WFHReq).filter(
        WFHReq.employee_id == emp.id,
        WFHReq.status.in_(["pending", "approved"]),
        WFHReq.request_date <= req.end_date,
        (WFHReq.end_date >= req.start_date) | (WFHReq.request_date >= req.start_date),
    ).first()
    if overlapping_wfh:
        raise HTTPException(
            status_code=400,
            detail="You have an overlapping WFH request for this date range. Please cancel it first.",
        )

    total_days = calculate_leave_days(db, req.start_date, req.end_date, req.is_half_day, emp, req.leave_type_id)
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range or no working days")

    sufficient, available, msg = check_leave_balance(
        db, emp.id, req.leave_type_id, total_days, req.start_date.year,
    )
    if not sufficient:
        raise HTTPException(status_code=400, detail=msg)

    leave_req = LeaveRequest(
        employee_id=emp.id,
        leave_type_id=req.leave_type_id,
        start_date=req.start_date,
        end_date=req.end_date,
        total_days=total_days,
        is_half_day=req.is_half_day,
        half_day_type=req.half_day_type,
        reason=req.reason,
        status=LeaveStatus.PENDING.value,
    )
    db.add(leave_req)
    db.flush()

    update_leave_balance_on_apply(db, emp.id, req.leave_type_id, total_days, req.start_date.year)
    effective_first_approver_id = resolve_first_approver_from_policy(db, emp, req.first_approver_id)
    create_approval_chain(db, leave_req, emp, first_approver_id=effective_first_approver_id)
    notify_leave_chain(db, leave_req, emp)

    log_audit(db, current_user.id, "create", "leave_request", leave_req.id)
    db.refresh(leave_req)

    lt = db.query(LeaveType).filter(LeaveType.id == req.leave_type_id).first()
    return LeaveRequestResponse(
        id=leave_req.id,
        employee_id=emp.id,
        employee_name=f"{emp.first_name} {emp.last_name}",
        leave_type=LeaveTypeResponse.model_validate(lt) if lt else None,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        total_days=leave_req.total_days,
        is_half_day=leave_req.is_half_day,
        half_day_type=leave_req.half_day_type,
        reason=leave_req.reason,
        status=leave_req.status,
        current_approval_step=leave_req.current_approval_step,
        created_at=leave_req.created_at,
    )


@router.get("/my-requests", response_model=list[LeaveRequestResponse])
def my_leave_requests(
    year: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    q = db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp.id)
    if year:
        from sqlalchemy import extract
        q = q.filter(extract("year", LeaveRequest.start_date) == year)
    if status:
        q = q.filter(LeaveRequest.status == status)

    requests = q.order_by(LeaveRequest.created_at.desc()).all()
    result = []
    for lr in requests:
        lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()
        approvals = [
            LeaveApprovalResponse(
                id=a.id, approver_id=a.approver_id,
                approver_name=f"{a.approver.first_name} {a.approver.last_name}" if a.approver else None,
                step_order=a.step_order, status=a.status,
                comments=a.comments, acted_at=a.acted_at,
            ) for a in lr.approvals
        ]
        result.append(LeaveRequestResponse(
            id=lr.id, employee_id=emp.id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            leave_type=LeaveTypeResponse.model_validate(lt) if lt else None,
            start_date=lr.start_date, end_date=lr.end_date,
            total_days=lr.total_days, is_half_day=lr.is_half_day,
            half_day_type=lr.half_day_type, reason=lr.reason,
            status=lr.status, current_approval_step=lr.current_approval_step,
            created_at=lr.created_at, approvals=approvals,
        ))
    return result


@router.get("/request/{request_id}/detail")
def leave_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full detail view of a leave request with step-by-step approval timeline."""
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")

    emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
    lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()

    # Build timeline events
    timeline = []

    # 1. Submission event
    timeline.append({
        "event": "submitted",
        "actor": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        "timestamp": lr.created_at.isoformat() if lr.created_at else None,
        "details": f"Applied for {lt.name if lt else 'Leave'} ({lr.total_days} day{'s' if lr.total_days != 1 else ''})",
    })

    # 2. Approval steps
    for a in lr.approvals:
        approver = db.query(Employee).filter(Employee.id == a.approver_id).first()
        approver_name = f"{approver.first_name} {approver.last_name}" if approver else "Unknown"

        if a.status == "pending":
            timeline.append({
                "event": "pending_review",
                "actor": approver_name,
                "timestamp": None,
                "details": f"Awaiting review (Step {a.step_order})",
            })
        else:
            timeline.append({
                "event": a.status,
                "actor": approver_name,
                "timestamp": a.acted_at.isoformat() if a.acted_at else None,
                "details": a.comments or f"{a.status.title()} at step {a.step_order}",
            })

    # 3. Cancellation event (if applicable)
    if lr.status == "cancelled":
        timeline.append({
            "event": "cancelled",
            "actor": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "timestamp": lr.updated_at.isoformat() if lr.updated_at else None,
            "details": "Request cancelled by employee",
        })

    return {
        "id": lr.id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
        "leave_type": lt.name if lt else "Unknown",
        "start_date": str(lr.start_date),
        "end_date": str(lr.end_date),
        "total_days": lr.total_days,
        "is_half_day": lr.is_half_day,
        "reason": lr.reason,
        "status": lr.status,
        "attachment_path": lr.attachment_path,
        "created_at": lr.created_at.isoformat() if lr.created_at else None,
        "timeline": timeline,
    }


@router.get("/balance", response_model=list[LeaveBalanceResponse])
def my_leave_balance(
    year: int = Query(2026),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == emp.id,
        LeaveBalance.year == year,
    ).all()

    is_male = (emp.gender or "").lower() == "male"
    return [
        LeaveBalanceResponse(
            id=b.id,
            leave_type=LeaveTypeResponse.model_validate(b.leave_type),
            year=b.year, entitled=b.entitled, used=b.used,
            pending=b.pending, carried_forward=b.carried_forward,
            adjusted=b.adjusted, remaining=b.remaining,
        ) for b in balances
        if not (is_male and b.leave_type.code == "ML")
    ]


@router.get("/org-balance")
def org_leave_balance(
    year: int = Query(2026),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns leave balances for all employees in the caller's org tree.
    - Direct manager sees direct reports' balances.
    - Skip-level manager sees all subordinates recursively (cascading up to CEO).
    """
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # Recursively collect all subordinate employee IDs
    def get_all_subordinate_ids(manager_id: int) -> list[int]:
        direct = db.query(Employee).filter(Employee.manager_id == manager_id, Employee.status == "active").all()
        ids = []
        for d in direct:
            ids.append(d.id)
            ids.extend(get_all_subordinate_ids(d.id))
        return ids

    sub_ids = get_all_subordinate_ids(emp.id)
    if not sub_ids:
        return []

    # Fetch all balances for subordinates
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id.in_(sub_ids),
        LeaveBalance.year == year,
    ).all()

    # Group by employee
    from collections import defaultdict
    emp_balances = defaultdict(list)
    for b in balances:
        emp_balances[b.employee_id].append(b)

    # Build response
    result = []
    for eid in sub_ids:
        e = db.query(Employee).filter(Employee.id == eid).first()
        if not e:
            continue
        dept_name = e.department.name if e.department else None
        desig_title = e.designation.title if e.designation else None
        mgr = db.query(Employee).filter(Employee.id == e.manager_id).first() if e.manager_id else None

        leave_data = []
        for b in emp_balances.get(eid, []):
            lt = db.query(LeaveType).filter(LeaveType.id == b.leave_type_id).first()
            leave_data.append({
                "leave_type": lt.name if lt else "Unknown",
                "leave_code": lt.code if lt else "",
                "entitled": b.entitled,
                "used": b.used,
                "pending": b.pending,
                "carried_forward": b.carried_forward,
                "adjusted": b.adjusted,
                "remaining": b.remaining,
            })

        result.append({
            "employee_id": e.employee_id,
            "name": f"{e.first_name} {e.last_name}",
            "department": dept_name,
            "designation": desig_title,
            "manager_name": f"{mgr.first_name} {mgr.last_name}" if mgr else None,
            "is_direct_report": e.manager_id == emp.id,
            "balances": leave_data,
        })

    return result


@router.get("/eligible-first-approvers")
def eligible_first_approvers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns employees who can serve as optional first-level approvers (managers/approvers)."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    # Return all employees with manager or approver role in the same department
    eligible = db.query(Employee).join(User, Employee.user_id == User.id).filter(
        User.role.in_(["manager", "approver", "hr_admin", "super_admin"]),
        Employee.status == "active",
        Employee.id != emp.id,  # exclude self
    ).all()

    return [
        {
            "id": e.id,
            "name": f"{e.first_name} {e.last_name}",
            "designation": e.designation.title if e.designation else None,
            "department": e.department.name if e.department else None,
        }
        for e in eligible
    ]


@router.get("/first-approver-config", response_model=FirstApproverConfigResponse)
def get_first_approver_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the effective first-approver policy for the current employee.

    Resolution order:
      1. Department-specific policy (matching the employee's department)
      2. Global policy  (department_id IS NULL)
      3. Default: employee_choice
    """
    from app.models.misc import FirstApproverPolicy

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return FirstApproverConfigResponse(mode="employee_choice")

    policy = None
    if emp.department_id:
        policy = db.query(FirstApproverPolicy).filter(
            FirstApproverPolicy.department_id == emp.department_id,
            FirstApproverPolicy.is_active == True,
        ).first()

    if not policy:
        policy = db.query(FirstApproverPolicy).filter(
            FirstApproverPolicy.department_id == None,
            FirstApproverPolicy.is_active == True,
        ).first()

    def _eligible():
        rows = db.query(Employee).join(User, Employee.user_id == User.id).filter(
            User.role.in_(["manager", "approver", "hr_admin", "super_admin"]),
            Employee.status == "active",
            Employee.id != emp.id,
        ).all()
        return [
            EligibleApproverItem(
                id=e.id,
                name=f"{e.first_name} {e.last_name}",
                designation=e.designation.title if e.designation else None,
                department=e.department.name if e.department else None,
            )
            for e in rows
        ]

    if not policy:
        return FirstApproverConfigResponse(mode="employee_choice", eligible_approvers=_eligible())

    if policy.mode == "employee_choice":
        return FirstApproverConfigResponse(mode="employee_choice", eligible_approvers=_eligible())

    if policy.mode == "fixed":
        fa_name = None
        if policy.fixed_approver:
            fa_name = f"{policy.fixed_approver.first_name} {policy.fixed_approver.last_name}"
        return FirstApproverConfigResponse(
            mode="fixed",
            fixed_approver_id=policy.fixed_approver_id,
            fixed_approver_name=fa_name,
        )

    # disabled, manager, department_head — no dropdown needed
    return FirstApproverConfigResponse(mode=policy.mode)


@router.get("/balance-check", response_model=LeaveBalanceCheckResponse)
def check_balance(
    leave_type_id: int,
    start_date: str,
    end_date: str,
    is_half_day: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date as date_type
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    sd = date_type.fromisoformat(start_date)
    ed = date_type.fromisoformat(end_date)
    days = calculate_leave_days(db, sd, ed, is_half_day, emp, leave_type_id)
    sufficient, available, msg = check_leave_balance(db, emp.id, leave_type_id, days, sd.year)

    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    return LeaveBalanceCheckResponse(
        leave_type=lt.name if lt else "Unknown",
        available=available,
        requested_days=days,
        sufficient=sufficient,
        message=msg,
    )


@router.post("/{request_id}/cancel")
def cancel_leave(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    lr = db.query(LeaveRequest).filter(
        LeaveRequest.id == request_id,
        LeaveRequest.employee_id == emp.id,
    ).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if lr.status not in ("pending", "sent_back"):
        raise HTTPException(status_code=400, detail="Cannot cancel this leave request")

    lr.status = LeaveStatus.CANCELLED.value
    update_leave_balance_on_reject(db, emp.id, lr.leave_type_id, lr.total_days, lr.start_date.year)
    db.commit()

    # Notify pending approvers about the cancellation
    pending_approvals = db.query(LeaveApproval).filter(
        LeaveApproval.leave_request_id == lr.id,
        LeaveApproval.status == "pending",
    ).all()
    for approval in pending_approvals:
        approver = db.query(Employee).filter(Employee.id == approval.approver_id).first()
        if approver and approver.user_id:
            create_notification(
                db, approver.user_id,
                "Leave Request Cancelled",
                f"{emp.first_name} {emp.last_name} has cancelled their leave request ({lr.start_date} to {lr.end_date}).",
                type="leave",
                link="/approvals",
            )

    log_audit(db, current_user.id, "cancel", "leave_request", lr.id)
    return {"message": "Leave request cancelled"}


@router.get("/team-calendar")
def team_calendar(
    month: int = Query(default=None),
    year: int = Query(default=None),
    department_id: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns approved/pending leave requests for the whole org (or dept filter) for a given month."""
    from datetime import date
    from sqlalchemy import extract as sa_extract
    today = date.today()
    m = month or today.month
    y = year or today.year

    q = db.query(LeaveRequest).filter(
        LeaveRequest.status.in_(["approved", "pending"]),
        sa_extract("year", LeaveRequest.start_date) == y,
        sa_extract("month", LeaveRequest.start_date) == m,
    )

    if department_id:
        emp_ids = [e.id for e in db.query(Employee).filter(Employee.department_id == department_id).all()]
        q = q.filter(LeaveRequest.employee_id.in_(emp_ids))

    requests = q.all()
    result = []
    for lr in requests:
        emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
        lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()
        result.append({
            "id": lr.id,
            "employee_id": lr.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "employee_photo": emp.profile_photo if emp else None,
            "department": emp.department.name if emp and emp.department else None,
            "leave_type": lt.name if lt else "Leave",
            "leave_type_color": lt.color if lt and hasattr(lt, "color") else "#6366f1",
            "start_date": str(lr.start_date),
            "end_date": str(lr.end_date),
            "total_days": lr.total_days,
            "status": lr.status,
        })
    return result


@router.get("/approve-via-email")
def approve_via_email(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle approval/rejection via email deep link."""
    from app.services.email_service import verify_approval_token
    from app.models.leave import LeaveApproval
    from app.services.leave_service import update_leave_balance_on_approve, update_leave_balance_on_reject

    payload = verify_approval_token(token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired approval link")

    leave_request_id = payload["leave_request_id"]
    approver_id = payload["approver_id"]
    action = payload["action"]  # "approve" or "reject"

    lr = db.query(LeaveRequest).filter(LeaveRequest.id == leave_request_id).first()
    if not lr or lr.status != "pending":
        raise HTTPException(status_code=400, detail="Leave request is no longer pending")

    approval = db.query(LeaveApproval).filter(
        LeaveApproval.leave_request_id == leave_request_id,
        LeaveApproval.approver_id == approver_id,
        LeaveApproval.status == "pending",
    ).first()
    if not approval:
        raise HTTPException(status_code=400, detail="No pending approval found for you")

    from datetime import datetime, timezone
    if action == "approve":
        approval.status = "approved"
        approval.acted_at = datetime.now(timezone.utc)
        # Check if all steps are approved
        all_approvals = db.query(LeaveApproval).filter(
            LeaveApproval.leave_request_id == leave_request_id
        ).all()
        all_approved = all(a.status == "approved" for a in all_approvals)
        if all_approved:
            lr.status = "approved"
            update_leave_balance_on_approve(db, lr.employee_id, lr.leave_type_id, lr.total_days, lr.start_date.year)
    elif action == "reject":
        approval.status = "rejected"
        approval.acted_at = datetime.now(timezone.utc)
        lr.status = "rejected"
        update_leave_balance_on_reject(db, lr.employee_id, lr.leave_type_id, lr.total_days, lr.start_date.year)

    db.commit()
    # Redirect to the approvals page
    return RedirectResponse(url=f"{settings.APP_BASE_URL}/approvals?action={action}&request_id={leave_request_id}")


# ══════════════════════════════════════════════════════════════
# Comp-Off Endpoints
# ══════════════════════════════════════════════════════════════

@router.post("/comp-off/request", response_model=CompOffGrantResponse)
def request_comp_off(
    req: CompOffRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Employee submits a comp-off request for a date they worked (e.g., weekend/holiday)."""
    from app.models.leave import CompOffGrant
    from datetime import timedelta

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # Validate work_date is in the past
    from datetime import date as _date
    if req.work_date > _date.today():
        raise HTTPException(status_code=400, detail="Work date must be in the past")

    # Check for duplicate
    existing = db.query(CompOffGrant).filter(
        CompOffGrant.employee_id == emp.id,
        CompOffGrant.work_date == req.work_date,
        CompOffGrant.status.notin_(["rejected", "expired"]),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Comp-off already requested for this date")

    grant = CompOffGrant(
        employee_id=emp.id,
        work_date=req.work_date,
        reason=req.reason,
        hours_worked=req.hours_worked,
        days_granted=req.days_granted,
        status="pending",
        expires_at=req.work_date + timedelta(days=90),
    )
    db.add(grant)
    db.flush()

    # Notify manager
    if emp.manager_id:
        mgr = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if mgr and mgr.user_id:
            create_notification(
                db, mgr.user_id,
                "Comp-Off Request",
                f"{emp.first_name} {emp.last_name} has requested comp-off for working on {req.work_date}.",
                type="approval",
                link="/leave/comp-off",
            )

    log_audit(db, current_user.id, "create", "comp_off_grant", grant.id)
    db.commit()
    db.refresh(grant)

    return CompOffGrantResponse(
        id=grant.id, employee_id=emp.id,
        employee_name=f"{emp.first_name} {emp.last_name}",
        work_date=grant.work_date, reason=grant.reason,
        hours_worked=grant.hours_worked, days_granted=grant.days_granted,
        status=grant.status, expires_at=grant.expires_at,
        created_at=grant.created_at,
    )


@router.get("/comp-off/my-requests", response_model=list[CompOffGrantResponse])
def my_comp_off_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.leave import CompOffGrant
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    grants = db.query(CompOffGrant).filter(
        CompOffGrant.employee_id == emp.id
    ).order_by(CompOffGrant.created_at.desc()).all()
    return [
        CompOffGrantResponse(
            id=g.id, employee_id=emp.id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            work_date=g.work_date, reason=g.reason,
            hours_worked=g.hours_worked, days_granted=g.days_granted,
            status=g.status, manager_comments=g.manager_comments,
            hr_comments=g.hr_comments, expires_at=g.expires_at,
            created_at=g.created_at,
        ) for g in grants
    ]


@router.get("/comp-off/pending-approvals", response_model=list[CompOffGrantResponse])
def pending_comp_off_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager sees pending comp-off requests from their direct reports."""
    from app.models.leave import CompOffGrant
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    # Manager approval (step 1)
    if current_user.role in ("manager", "approver"):
        direct_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
        grants = db.query(CompOffGrant).filter(
            CompOffGrant.employee_id.in_(direct_ids),
            CompOffGrant.status == "pending",
        ).all()
    # HR approval (step 2)
    elif current_user.role in ("hr_admin", "super_admin"):
        grants = db.query(CompOffGrant).filter(
            CompOffGrant.status == "manager_approved",
        ).all()
    else:
        return []

    result = []
    for g in grants:
        e = db.query(Employee).filter(Employee.id == g.employee_id).first()
        result.append(CompOffGrantResponse(
            id=g.id, employee_id=g.employee_id,
            employee_name=f"{e.first_name} {e.last_name}" if e else "Unknown",
            work_date=g.work_date, reason=g.reason,
            hours_worked=g.hours_worked, days_granted=g.days_granted,
            status=g.status, expires_at=g.expires_at,
            created_at=g.created_at,
        ))
    return result


@router.post("/comp-off/{grant_id}/manager-action")
def manager_action_comp_off(
    grant_id: int,
    req: CompOffActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager approves or rejects a comp-off request (step 1 of 2)."""
    from app.models.leave import CompOffGrant
    from datetime import datetime as dt, timezone as tz

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    grant = db.query(CompOffGrant).filter(CompOffGrant.id == grant_id, CompOffGrant.status == "pending").first()
    if not grant:
        raise HTTPException(status_code=404, detail="Comp-off request not found or not pending")

    grant.manager_id = emp.id if emp else None
    grant.manager_comments = req.comments
    grant.manager_action_at = dt.now(tz.utc)

    if req.action == "approve":
        grant.status = "manager_approved"
        # Notify HR for step 2
        hr_admins = db.query(User).filter(User.role.in_(["hr_admin", "super_admin"]), User.is_active == True).all()
        requester = db.query(Employee).filter(Employee.id == grant.employee_id).first()
        for hr in hr_admins:
            create_notification(
                db, hr.id,
                "Comp-Off Pending HR Approval",
                f"Comp-off for {requester.first_name} {requester.last_name} ({grant.work_date}) approved by manager. Awaiting HR approval.",
                type="approval",
                link="/leave/comp-off",
            )
    elif req.action == "reject":
        grant.status = "rejected"
        requester = db.query(Employee).filter(Employee.id == grant.employee_id).first()
        if requester and requester.user_id:
            create_notification(
                db, requester.user_id,
                "Comp-Off Rejected",
                f"Your comp-off request for {grant.work_date} was rejected by your manager.",
                type="leave",
                link="/leave",
            )

    log_audit(db, current_user.id, req.action, "comp_off_grant", grant.id)
    db.commit()
    return {"message": f"Comp-off {req.action}d"}


@router.post("/comp-off/{grant_id}/hr-action")
def hr_action_comp_off(
    grant_id: int,
    req: CompOffActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR approves or rejects a comp-off (step 2 of 2). On approval, credits balance."""
    from app.models.leave import CompOffGrant
    from datetime import datetime as dt, timezone as tz

    if current_user.role not in ("hr_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only HR can perform this action")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    grant = db.query(CompOffGrant).filter(CompOffGrant.id == grant_id, CompOffGrant.status == "manager_approved").first()
    if not grant:
        raise HTTPException(status_code=404, detail="Comp-off not found or not at HR approval stage")

    grant.hr_approver_id = emp.id if emp else None
    grant.hr_comments = req.comments
    grant.hr_action_at = dt.now(tz.utc)

    requester = db.query(Employee).filter(Employee.id == grant.employee_id).first()

    if req.action == "approve":
        grant.status = "hr_approved"
        # Credit CO balance
        co_type = db.query(LeaveType).filter(LeaveType.code == "CO").first()
        if co_type:
            year = grant.work_date.year
            balance = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == grant.employee_id,
                LeaveBalance.leave_type_id == co_type.id,
                LeaveBalance.year == year,
            ).first()
            if balance:
                balance.adjusted += grant.days_granted
            else:
                db.add(LeaveBalance(
                    employee_id=grant.employee_id,
                    leave_type_id=co_type.id,
                    year=year,
                    entitled=0, used=0, pending=0,
                    carried_forward=0, adjusted=grant.days_granted,
                ))
        if requester and requester.user_id:
            create_notification(
                db, requester.user_id,
                "Comp-Off Approved!",
                f"Your comp-off for {grant.work_date} has been approved. {grant.days_granted} day(s) credited to your balance.",
                type="leave",
                link="/leave",
            )
    elif req.action == "reject":
        grant.status = "rejected"
        if requester and requester.user_id:
            create_notification(
                db, requester.user_id,
                "Comp-Off Rejected by HR",
                f"Your comp-off request for {grant.work_date} was rejected by HR.",
                type="leave",
                link="/leave",
            )

    log_audit(db, current_user.id, req.action, "comp_off_grant", grant.id)
    db.commit()
    return {"message": f"Comp-off {req.action}d by HR"}
