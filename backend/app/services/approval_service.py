from datetime import datetime, timezone, date

from sqlalchemy.orm import Session

from app.models.leave import LeaveRequest, LeaveApproval, LeaveStatus, ApprovalStatus
from app.models.workflow import ApprovalWorkflow, ApprovalWorkflowStep, AssignedApprover
from app.models.user import Employee
from app.models.organization import Department
from app.models.misc import DelegationSetting, FirstApproverPolicy
from app.services.leave_service import update_leave_balance_on_approve, update_leave_balance_on_reject
from app.services.notification_service import create_notification


def resolve_active_delegate(db: Session, approver_id: int) -> int:
    """If the approver has an active delegation today, return the delegate's id instead."""
    today = date.today()
    delegation = db.query(DelegationSetting).filter(
        DelegationSetting.delegator_id == approver_id,
        DelegationSetting.is_active == True,
        DelegationSetting.start_date <= today,
        DelegationSetting.end_date >= today,
    ).first()
    return delegation.delegate_id if delegation else approver_id


def resolve_workflow(db: Session, employee: Employee, leave_type_id: int) -> ApprovalWorkflow | None:
    """Find the best matching approval workflow for this employee and leave type."""
    # 1. Check for department + leave_type + band match
    if employee.department_id and employee.band:
        wf = db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.department_id == employee.department_id,
            ApprovalWorkflow.leave_type_id == leave_type_id,
            ApprovalWorkflow.band == employee.band,
            ApprovalWorkflow.is_active == True,
        ).first()
        if wf:
            return wf

    # 2. Check for department + leave_type match
    if employee.department_id:
        wf = db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.department_id == employee.department_id,
            ApprovalWorkflow.leave_type_id == leave_type_id,
            ApprovalWorkflow.band == None,
            ApprovalWorkflow.is_active == True,
        ).first()
        if wf:
            return wf

    # 3. Check for department-only match
    if employee.department_id:
        wf = db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.department_id == employee.department_id,
            ApprovalWorkflow.leave_type_id == None,
            ApprovalWorkflow.is_active == True,
        ).first()
        if wf:
            return wf

    # 4. Fall back to default workflow
    wf = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.is_default == True,
        ApprovalWorkflow.is_active == True,
    ).first()
    return wf


def resolve_approver_for_step(
    db: Session,
    employee: Employee,
    step: ApprovalWorkflowStep,
) -> int | None:
    """Resolve who the actual approver is for a workflow step."""
    if step.approver_role == "specific" and step.specific_approver_id:
        return step.specific_approver_id

    if step.approver_role == "manager":
        # Check for assigned approver first
        assigned = db.query(AssignedApprover).filter(
            AssignedApprover.employee_id == employee.id,
            AssignedApprover.approver_type == "primary",
            AssignedApprover.is_active == True,
        ).order_by(AssignedApprover.priority).first()
        if assigned:
            return assigned.approver_id
        return employee.manager_id

    if step.approver_role == "department_head":
        if employee.department_id:
            dept = db.query(Department).filter(Department.id == employee.department_id).first()
            if dept and dept.head_id:
                return dept.head_id
        # No department head configured — skip this step rather than falling back to the
        # manager (which would duplicate the step-1 manager approval).
        return None

    if step.approver_role == "hr_admin":
        # Find an HR admin employee
        from app.models.user import User, UserRole
        hr_user = db.query(User).filter(User.role == UserRole.HR_ADMIN.value, User.is_active == True).first()
        if hr_user and hr_user.employee:
            return hr_user.employee.id
        return None

    return None


def resolve_first_approver_from_policy(
    db: Session,
    employee: Employee,
    submitted_id: int | None,
) -> int | None:
    """Return the first-approver employee ID that should be used, respecting the configured policy.

    If no policy is configured the submitted_id is returned as-is (original behaviour).
    """
    policy = None
    if employee.department_id:
        policy = db.query(FirstApproverPolicy).filter(
            FirstApproverPolicy.department_id == employee.department_id,
            FirstApproverPolicy.is_active == True,
        ).first()
    if not policy:
        policy = db.query(FirstApproverPolicy).filter(
            FirstApproverPolicy.department_id == None,
            FirstApproverPolicy.is_active == True,
        ).first()

    if not policy:
        return submitted_id

    mode = policy.mode
    if mode == "disabled":
        return None
    if mode == "employee_choice":
        return submitted_id
    if mode == "fixed":
        return policy.fixed_approver_id
    if mode == "manager":
        return employee.manager_id
    if mode == "department_head":
        if employee.department_id:
            dept = db.query(Department).filter(Department.id == employee.department_id).first()
            if dept and dept.head_id:
                return dept.head_id
        return None
    return submitted_id


def create_approval_chain(
    db: Session,
    leave_request: LeaveRequest,
    employee: Employee,
    first_approver_id: int | None = None,
):
    """Create the full approval chain for a leave request."""
    # ── CEO Auto-Approve: CEO does not need approval ──
    from app.models.organization import Designation
    if employee.designation_id:
        desig = db.query(Designation).filter(Designation.id == employee.designation_id).first()
        if desig and desig.level == 1:  # CEO / Managing Director
            leave_request.status = LeaveStatus.APPROVED.value
            from app.services.leave_service import update_leave_balance_on_approve
            update_leave_balance_on_approve(
                db, leave_request.employee_id,
                leave_request.leave_type_id,
                leave_request.total_days,
                leave_request.start_date.year,
            )
            db.commit()
            return

    workflow = resolve_workflow(db, employee, leave_request.leave_type_id)

    if not workflow or not workflow.steps:
        # Default: single-step manager approval
        approver_id = employee.manager_id
        if not approver_id and not first_approver_id:
            # Auto-approve if no manager and no first approver
            leave_request.status = LeaveStatus.APPROVED.value
            db.commit()
            return

        step = 1
        # Optional first-level approver (e.g., Product Manager)
        if first_approver_id:
            first_aid = resolve_active_delegate(db, first_approver_id)
            approval = LeaveApproval(
                leave_request_id=leave_request.id,
                approver_id=first_aid,
                step_order=step,
                status=ApprovalStatus.PENDING.value,
            )
            db.add(approval)
            step += 1

        if approver_id:
            approval = LeaveApproval(
                leave_request_id=leave_request.id,
                approver_id=approver_id,
                step_order=step,
                status=ApprovalStatus.PENDING.value,
            )
            db.add(approval)

        db.commit()

        # Notify first step approver
        first_step = db.query(LeaveApproval).filter(
            LeaveApproval.leave_request_id == leave_request.id,
            LeaveApproval.step_order == 1,
        ).first()
        if first_step:
            approver = db.query(Employee).filter(Employee.id == first_step.approver_id).first()
            if approver and approver.user_id:
                create_notification(
                    db, approver.user_id,
                    "New Leave Request",
                    f"{employee.first_name} {employee.last_name} has requested leave.",
                    type="approval",
                    link=f"/approvals",
                )
        return

    # Optional first-level approver (e.g., Product Manager) — inserted before workflow steps
    if first_approver_id:
        first_aid = resolve_active_delegate(db, first_approver_id)
        approval = LeaveApproval(
            leave_request_id=leave_request.id,
            approver_id=first_aid,
            step_order=0,  # Before workflow step 1
            status=ApprovalStatus.PENDING.value,
        )
        db.add(approval)

    # Create approval entries for each step (auto-route to delegate if approver is OOO)
    for step in workflow.steps:
        approver_id = resolve_approver_for_step(db, employee, step)
        if approver_id:
            approver_id = resolve_active_delegate(db, approver_id)
            approval = LeaveApproval(
                leave_request_id=leave_request.id,
                approver_id=approver_id,
                step_order=step.step_order,
                status=ApprovalStatus.PENDING.value,
            )
            db.add(approval)

    db.commit()

    # Notify first step approver
    first_approval = db.query(LeaveApproval).filter(
        LeaveApproval.leave_request_id == leave_request.id,
        LeaveApproval.step_order == 1,
    ).first()
    if first_approval:
        approver = db.query(Employee).filter(Employee.id == first_approval.approver_id).first()
        if approver and approver.user_id:
            create_notification(
                db, approver.user_id,
                "New Leave Request",
                f"{employee.first_name} {employee.last_name} has requested leave.",
                type="approval",
                link=f"/approvals",
            )


def process_approval_action(
    db: Session,
    leave_request: LeaveRequest,
    approval: LeaveApproval,
    action: str,
    comments: str | None = None,
    delegate_to_id: int | None = None,
):
    """Process an approver's action on a leave request."""
    now = datetime.now(timezone.utc)
    employee = db.query(Employee).filter(Employee.id == leave_request.employee_id).first()

    if action == "approve":
        approval.status = ApprovalStatus.APPROVED.value
        approval.comments = comments
        approval.acted_at = now

        # Check if there's a next step
        next_approval = db.query(LeaveApproval).filter(
            LeaveApproval.leave_request_id == leave_request.id,
            LeaveApproval.step_order == approval.step_order + 1,
        ).first()

        if next_approval:
            leave_request.current_approval_step = approval.step_order + 1
            db.commit()
            # Notify next approver
            next_approver = db.query(Employee).filter(Employee.id == next_approval.approver_id).first()
            if next_approver and next_approver.user_id:
                create_notification(
                    db, next_approver.user_id,
                    "Leave Request Awaiting Your Approval",
                    f"{employee.first_name} {employee.last_name}'s leave request needs your approval (Step {next_approval.step_order}).",
                    type="approval",
                    link="/approvals",
                )
        else:
            # All steps approved - finalize
            leave_request.status = LeaveStatus.APPROVED.value
            update_leave_balance_on_approve(
                db, leave_request.employee_id,
                leave_request.leave_type_id,
                leave_request.total_days,
                leave_request.start_date.year,
            )
            if employee and employee.user_id:
                create_notification(
                    db, employee.user_id,
                    "Leave Approved",
                    f"Your leave request from {leave_request.start_date} to {leave_request.end_date} has been approved.",
                    type="leave",
                    link="/leave",
                )

    elif action == "reject":
        approval.status = ApprovalStatus.REJECTED.value
        approval.comments = comments
        approval.acted_at = now
        leave_request.status = LeaveStatus.REJECTED.value
        update_leave_balance_on_reject(
            db, leave_request.employee_id,
            leave_request.leave_type_id,
            leave_request.total_days,
            leave_request.start_date.year,
        )
        if employee and employee.user_id:
            create_notification(
                db, employee.user_id,
                "Leave Rejected",
                f"Your leave request from {leave_request.start_date} to {leave_request.end_date} has been rejected.",
                type="leave",
                link="/leave",
            )

    elif action == "send_back":
        approval.status = ApprovalStatus.SENT_BACK.value
        approval.comments = comments
        approval.acted_at = now
        leave_request.status = LeaveStatus.SENT_BACK.value
        update_leave_balance_on_reject(
            db, leave_request.employee_id,
            leave_request.leave_type_id,
            leave_request.total_days,
            leave_request.start_date.year,
        )
        if employee and employee.user_id:
            create_notification(
                db, employee.user_id,
                "Leave Request Sent Back",
                f"Your leave request has been sent back for modification. Comments: {comments or 'None'}",
                type="leave",
                link="/leave",
            )

    elif action == "delegate" and delegate_to_id:
        approval.approver_id = delegate_to_id
        approval.status = ApprovalStatus.PENDING.value
        approval.comments = f"Delegated. Original comments: {comments or 'None'}"
        delegate = db.query(Employee).filter(Employee.id == delegate_to_id).first()
        if delegate and delegate.user_id:
            create_notification(
                db, delegate.user_id,
                "Leave Approval Delegated to You",
                f"A leave request has been delegated to you for approval.",
                type="approval",
                link="/approvals",
            )

    db.commit()
