from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveApproval, LeaveType
from app.schemas.leave import LeaveRequestResponse, LeaveTypeResponse, LeaveApprovalResponse, ApprovalActionRequest
from app.services.approval_service import process_approval_action
from app.services.audit_service import log_audit

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("/pending", response_model=list[LeaveRequestResponse])
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    pending_approvals = db.query(LeaveApproval).filter(
        LeaveApproval.approver_id == emp.id,
        LeaveApproval.status == "pending",
    ).all()

    results = []
    for approval in pending_approvals:
        lr = approval.leave_request
        if lr.current_approval_step != approval.step_order:
            continue
        req_emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
        lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()
        all_approvals = [
            LeaveApprovalResponse(
                id=a.id, approver_id=a.approver_id,
                approver_name=f"{a.approver.first_name} {a.approver.last_name}" if a.approver else None,
                step_order=a.step_order, status=a.status,
                comments=a.comments, acted_at=a.acted_at,
            ) for a in lr.approvals
        ]
        results.append(LeaveRequestResponse(
            id=lr.id, employee_id=lr.employee_id,
            employee_name=f"{req_emp.first_name} {req_emp.last_name}" if req_emp else None,
            leave_type=LeaveTypeResponse.model_validate(lt) if lt else None,
            start_date=lr.start_date, end_date=lr.end_date,
            total_days=lr.total_days, is_half_day=lr.is_half_day,
            half_day_type=lr.half_day_type, reason=lr.reason,
            status=lr.status, current_approval_step=lr.current_approval_step,
            created_at=lr.created_at, approvals=all_approvals,
        ))
    return results


@router.post("/{request_id}/action")
def take_action(
    request_id: int,
    req: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    lr = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")

    approval = db.query(LeaveApproval).filter(
        LeaveApproval.leave_request_id == request_id,
        LeaveApproval.approver_id == emp.id,
        LeaveApproval.step_order == lr.current_approval_step,
        LeaveApproval.status == "pending",
    ).first()
    if not approval:
        raise HTTPException(status_code=403, detail="Not authorized to act on this request")

    if req.action not in ("approve", "reject", "send_back", "delegate"):
        raise HTTPException(status_code=400, detail="Invalid action")

    process_approval_action(db, lr, approval, req.action, req.comments, req.delegate_to_id)
    log_audit(db, current_user.id, req.action, "leave_request", lr.id,
              new_values={"action": req.action, "comments": req.comments})

    return {"message": f"Leave request {req.action}d successfully"}


@router.get("/history", response_model=list[LeaveRequestResponse])
def approval_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    acted_approvals = db.query(LeaveApproval).filter(
        LeaveApproval.approver_id == emp.id,
        LeaveApproval.status != "pending",
    ).order_by(LeaveApproval.acted_at.desc()).limit(50).all()

    results = []
    seen = set()
    for a in acted_approvals:
        if a.leave_request_id in seen:
            continue
        seen.add(a.leave_request_id)
        lr = a.leave_request
        req_emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
        lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()
        results.append(LeaveRequestResponse(
            id=lr.id, employee_id=lr.employee_id,
            employee_name=f"{req_emp.first_name} {req_emp.last_name}" if req_emp else None,
            leave_type=LeaveTypeResponse.model_validate(lt) if lt else None,
            start_date=lr.start_date, end_date=lr.end_date,
            total_days=lr.total_days, is_half_day=lr.is_half_day,
            reason=lr.reason, status=lr.status,
            current_approval_step=lr.current_approval_step,
            created_at=lr.created_at,
        ))
    return results
