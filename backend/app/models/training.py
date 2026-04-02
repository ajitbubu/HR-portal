import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class CourseFormat(str, enum.Enum):
    ONLINE = "online"
    CLASSROOM = "classroom"
    BLENDED = "blended"


class EnrollmentStatus(str, enum.Enum):
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    duration_hours = Column(Float, default=0)
    format = Column(String(20), default=CourseFormat.ONLINE.value)
    instructor = Column(String(255))
    max_participants = Column(Integer, default=0)
    is_mandatory = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    enrollments = relationship("Enrollment", back_populates="course")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(String(20), default=EnrollmentStatus.ENROLLED.value)
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Float, nullable=True)
    progress = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    course = relationship("Course", back_populates="enrollments")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    issuing_body = Column(String(255))
    description = Column(Text)
    validity_months = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee_certifications = relationship("EmployeeCertification", back_populates="certification")


class EmployeeCertification(Base):
    __tablename__ = "employee_certifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    certification_id = Column(Integer, ForeignKey("certifications.id"), nullable=False)
    issued_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    credential_id = Column(String(100))
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    certification = relationship("Certification", back_populates="employee_certifications")


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    target_role = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    courses = relationship("LearningPathCourse", back_populates="learning_path", order_by="LearningPathCourse.sequence_order")


class LearningPathCourse(Base):
    __tablename__ = "learning_path_courses"

    id = Column(Integer, primary_key=True, index=True)
    learning_path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    is_required = Column(Boolean, default=True)

    learning_path = relationship("LearningPath", back_populates="courses")
    course = relationship("Course")


class ComplianceAssignment(Base):
    __tablename__ = "compliance_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    due_date = Column(Date, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", foreign_keys=[employee_id])
    course = relationship("Course")
