from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    name = Column(String(255), nullable=False)
    document_type = Column(String(50))  # id_proof, address_proof, education, offer_letter, payslip, other
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    description = Column(Text)
    uploaded_by_id = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="documents", foreign_keys=[employee_id])
    uploaded_by = relationship("Employee", foreign_keys=[uploaded_by_id])
