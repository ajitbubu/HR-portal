from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=True)
    band = Column(String(10), nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    steps = relationship("ApprovalWorkflowStep", back_populates="workflow", order_by="ApprovalWorkflowStep.step_order")


class ApprovalWorkflowStep(Base):
    __tablename__ = "approval_workflow_steps"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("approval_workflows.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    approver_role = Column(String(50), nullable=False)  # manager, department_head, hr_admin, specific
    specific_approver_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    workflow = relationship("ApprovalWorkflow", back_populates="steps")
    specific_approver = relationship("Employee", foreign_keys=[specific_approver_id])


class AssignedApprover(Base):
    __tablename__ = "assigned_approvers"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    approver_type = Column(String(50), default="primary")  # primary, fallback, delegate
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approver_id])
