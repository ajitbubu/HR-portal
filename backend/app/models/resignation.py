from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class ResignationRequest(Base):
    __tablename__ = "resignation_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    resignation_date = Column(Date, nullable=False)
    notice_period_days = Column(Integer, nullable=False)
    is_mandatory = Column(Boolean, default=True)       # True for India
    is_india_based = Column(Boolean, default=True)
    expected_last_day = Column(Date, nullable=False)   # computed, weekend-adjusted
    actual_last_day = Column(Date, nullable=True)      # set on approval/auto-approval
    reason = Column(Text, nullable=True)
    status = Column(String(30), default="pending")
    # status values: pending / approved / rejected / withdrawn / auto_approved / completed

    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # snapshot at submit time
    manager_action = Column(String(20), nullable=True)   # approved / rejected / modified
    manager_action_date = Column(DateTime(timezone=True), nullable=True)
    manager_comments = Column(Text, nullable=True)
    hr_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="resignation_requests")
    manager = relationship("Employee", foreign_keys=[manager_id])
    action_logs = relationship(
        "ResignationActionLog",
        back_populates="resignation",
        order_by="ResignationActionLog.created_at",
    )


class ResignationActionLog(Base):
    __tablename__ = "resignation_action_log"

    id = Column(Integer, primary_key=True, index=True)
    resignation_id = Column(Integer, ForeignKey("resignation_requests.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = system/auto
    action = Column(String(30), nullable=False)
    # action values: submitted / approved / rejected / withdrawn / auto_approved /
    #                modified_last_day / hr_note_added / completed
    comments = Column(Text, nullable=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    resignation = relationship("ResignationRequest", back_populates="action_logs")
