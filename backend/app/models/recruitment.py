import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime,
    ForeignKey, Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class JobPostingStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    ON_HOLD = "on_hold"


class CandidateStatus(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class InterviewType(str, enum.Enum):
    PHONE = "phone"
    VIDEO = "video"
    ONSITE = "onsite"


class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    description = Column(Text)
    requirements = Column(Text)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), default="USD")
    employment_type = Column(String(20), default="full_time")
    status = Column(String(20), default=JobPostingStatus.DRAFT.value)
    positions_count = Column(Integer, default=1)
    posted_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    closes_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    department = relationship("Department", foreign_keys=[department_id])
    location = relationship("Location", foreign_keys=[location_id])
    posted_by = relationship("Employee", foreign_keys=[posted_by_id])
    candidates = relationship("Candidate", back_populates="job_posting")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20))
    resume_path = Column(String(500))
    source = Column(String(50))
    status = Column(String(20), default=CandidateStatus.APPLIED.value)
    notes = Column(Text)
    rating = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    job_posting = relationship("JobPosting", back_populates="candidates")
    interviews = relationship("Interview", back_populates="candidate")
    offer = relationship("OfferLetter", back_populates="candidate", uselist=False)


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    interview_type = Column(String(20), default=InterviewType.VIDEO.value)
    location = Column(String(255))
    meeting_link = Column(String(500))
    feedback = Column(Text)
    rating = Column(Float, nullable=True)
    status = Column(String(20), default="scheduled")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate = relationship("Candidate", back_populates="interviews")
    interviewer = relationship("Employee", foreign_keys=[interviewer_id])


class OfferLetter(Base):
    __tablename__ = "offer_letters"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    position_title = Column(String(255), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    salary = Column(Float, nullable=False)
    salary_currency = Column(String(10), default="USD")
    start_date = Column(Date)
    expiry_date = Column(Date)
    status = Column(String(20), default=OfferStatus.DRAFT.value)
    terms = Column(Text)
    generated_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    candidate = relationship("Candidate", back_populates="offer")
    department = relationship("Department", foreign_keys=[department_id])
    generated_by = relationship("Employee", foreign_keys=[generated_by_id])
