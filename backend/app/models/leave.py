from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, Date,
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    SENT_BACK = "sent_back"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELEGATED = "delegated"
    SENT_BACK = "sent_back"


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    default_days = Column(Float, default=0)
    is_paid = Column(Boolean, default=True)
    carry_forward = Column(Boolean, default=False)
    max_carry_forward_days = Column(Float, default=0)
    requires_document = Column(Boolean, default=False)
    min_days_notice = Column(Integer, default=0)
    max_consecutive_days = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    policies = relationship("LeavePolicy", back_populates="leave_type")
    requests = relationship("LeaveRequest", back_populates="leave_type")
    balances = relationship("LeaveBalance", back_populates="leave_type")


class LeavePolicy(Base):
    __tablename__ = "leave_policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    accrual_type = Column(String(20), default="annual")  # annual, monthly, quarterly
    accrual_amount = Column(Float, default=0)
    max_balance = Column(Float, default=0)
    max_carry_forward = Column(Float, default=0)
    applicable_employment_types = Column(String(200))  # comma-separated
    applicable_bands = Column(String(200))  # comma-separated
    exclude_weekends = Column(Boolean, default=True)
    exclude_holidays = Column(Boolean, default=True)
    allow_half_day = Column(Boolean, default=True)
    allow_negative_balance = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    leave_type = relationship("LeaveType", back_populates="policies")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False)
    is_half_day = Column(Boolean, default=False)
    half_day_type = Column(String(20))  # first_half, second_half
    reason = Column(Text)
    attachment_path = Column(String(500))
    status = Column(String(20), default=LeaveStatus.PENDING.value)
    current_approval_step = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="leave_requests")
    leave_type = relationship("LeaveType", back_populates="requests")
    approvals = relationship("LeaveApproval", back_populates="leave_request", order_by="LeaveApproval.step_order")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    year = Column(Integer, nullable=False)
    entitled = Column(Float, default=0)
    used = Column(Float, default=0)
    pending = Column(Float, default=0)
    carried_forward = Column(Float, default=0)
    adjusted = Column(Float, default=0)

    @property
    def remaining(self) -> float:
        return self.entitled + self.carried_forward + self.adjusted - self.used - self.pending

    employee = relationship("Employee", back_populates="leave_balances")
    leave_type = relationship("LeaveType", back_populates="balances")


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id = Column(Integer, primary_key=True, index=True)
    leave_request_id = Column(Integer, ForeignKey("leave_requests.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String(20), default=ApprovalStatus.PENDING.value)
    comments = Column(Text)
    acted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    leave_request = relationship("LeaveRequest", back_populates="approvals")
    approver = relationship("Employee", foreign_keys=[approver_id])
