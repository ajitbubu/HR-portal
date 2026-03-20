from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship

from app.core.database import Base


class SalaryHistory(Base):
    __tablename__ = "salary_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    effective_date = Column(Date, nullable=False)
    base_pay = Column(Float, nullable=False)
    bonus = Column(Float, default=0)
    allowance = Column(Float, default=0)
    deduction = Column(Float, default=0)
    total = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    reason = Column(Text)
    changed_by_id = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="salary_history", foreign_keys=[employee_id])
    changed_by = relationship("Employee", foreign_keys=[changed_by_id])
