import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class ClaimStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"
    PARTIALLY_REIMBURSED = "partially_reimbursed"


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    max_amount = Column(Float, default=0)
    requires_receipt = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExpenseClaim(Base):
    __tablename__ = "expense_claims"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    total_amount = Column(Float, default=0)
    currency = Column(String(10), default="USD")
    status = Column(String(30), default=ClaimStatus.DRAFT.value)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    reimbursed_at = Column(DateTime(timezone=True), nullable=True)
    reimbursement_amount = Column(Float, default=0)
    rejection_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_id])
    items = relationship("ExpenseItem", back_populates="claim")


class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("expense_claims.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text)
    receipt_path = Column(String(500))
    is_billable = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    claim = relationship("ExpenseClaim", back_populates="items")
    category = relationship("ExpenseCategory", foreign_keys=[category_id])
    project = relationship("Project", foreign_keys=[project_id])
