from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    author = relationship("Employee", foreign_keys=[author_id])


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assigned_to_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    due_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])


class OffboardingTask(Base):
    __tablename__ = "offboarding_tasks"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assigned_to_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    status = Column(String(20), default="pending")
    due_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])


class CompanySetting(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    category = Column(String(50))  # general, leave, attendance, payroll
    description = Column(String(500))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    period = Column(String(50))  # Q1-2026, H1-2026, 2026
    status = Column(String(20), default="draft")  # draft, in_progress, completed
    rating = Column(Float)
    comments = Column(Text)
    goals = Column(Text)  # JSON string
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])


class DelegationSetting(Base):
    """Stores an active out-of-office delegation for an approver."""
    __tablename__ = "delegation_settings"

    id = Column(Integer, primary_key=True, index=True)
    delegator_id = Column(Integer, ForeignKey("employees.id"), nullable=False)   # manager going OOO
    delegate_id  = Column(Integer, ForeignKey("employees.id"), nullable=False)   # person covering
    start_date   = Column(Date, nullable=False)
    end_date     = Column(Date, nullable=False)
    reason       = Column(String(255))
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    delegator = relationship("Employee", foreign_keys=[delegator_id])
    delegate  = relationship("Employee", foreign_keys=[delegate_id])


class FirstApproverPolicy(Base):
    """Configures how the optional first-level approver is determined on leave requests.

    mode:
        "disabled"        — first approver field is hidden; no extra step inserted
        "employee_choice" — employee picks from a dropdown (original behaviour)
        "fixed"           — always route to fixed_approver_id
        "manager"         — always route to the employee's reporting manager
        "department_head" — always route to the department head
    Scoping: if department_id is set, the policy applies only to that department;
             department_id=None means it is the global/fallback policy.
    """
    __tablename__ = "first_approver_policies"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String(30), nullable=False, default="employee_choice")
    fixed_approver_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    fixed_approver = relationship("Employee", foreign_keys=[fixed_approver_id])


class HRTicket(Base):
    __tablename__ = "hr_tickets"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50))  # payroll, benefits, policy, other
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    status = Column(String(20), default="open")  # open, in_progress, resolved, closed
    assigned_to_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    resolution = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])
