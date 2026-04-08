"""Work From Home request and policy models."""
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Text, ForeignKey, Float,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class WFHPolicy(Base):
    __tablename__ = "wfh_policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    max_days_per_week = Column(Integer, default=2)
    max_days_per_month = Column(Integer, default=8)
    min_probation_months = Column(Integer, default=3)
    requires_manager_approval = Column(Boolean, default=True)
    eligible_departments = Column(Text)  # comma-separated dept IDs, empty = all
    eligible_designations = Column(Text)  # comma-separated designation IDs, empty = all
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WFHRequest(Base):
    __tablename__ = "wfh_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    request_date = Column(Date, nullable=False)  # the date employee wants to WFH
    end_date = Column(Date, nullable=True)  # for multi-day requests; null = single day
    wfh_type = Column(String(30), default="regular")  # regular, full_time, emergency
    reason = Column(Text)
    status = Column(String(20), default="pending")  # pending, approved, rejected, cancelled
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approver_comments = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id], backref="wfh_requests")
    approver = relationship("Employee", foreign_keys=[approved_by])

    @property
    def total_days(self) -> int:
        if not self.end_date or self.end_date == self.request_date:
            return 1
        return (self.end_date - self.request_date).days + 1
