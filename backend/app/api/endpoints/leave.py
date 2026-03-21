from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus
from app.schemas.leave import (
    LeaveApplyRequest, LeaveRequestResponse, LeaveBalanceResponse,
    LeaveBalanceCheckResponse, LeaveTypeResponse, LeaveApprovalResponse,
)
from app.services.leave_service import (
    calculate_leave_days, check_leave_balance, update_leave_balance_on_apply,
    update_leave_balance_on_reject,
)
from app.services.approval_service import create_approval_chain
from app.services.audit_service import log_audit

router = APIRouter(prefix="/leave", tags=["Leave Management"])


@router.get("/types", response_model=list[LeaveTypeResponse])
def get_leave_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(LeaveType).filter(LeaveType.is_active == True).all()


@router.post("/apply", response_model=LeaveRequestResponse)
def apply_leave(
    req: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

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
    create_approval_chain(db, leave_req, emp)

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

    return [
        LeaveBalanceResponse(
            id=b.id,
            leave_type=LeaveTypeResponse.model_validate(b.leave_type),
            year=b.year, entitled=b.entitled, used=b.used,
            pending=b.pending, carried_forward=b.carried_forward,
            adjusted=b.adjusted, remaining=b.remaining,
        ) for b in balances
    ]


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

    log_audit(db, current_user.id, "cancel", "leave_request", lr.id)
    return {"message": "Leave request cancelled"}
