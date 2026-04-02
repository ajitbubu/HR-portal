from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text,
)
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    HR_ADMIN = "hr_admin"
    MANAGER = "manager"
    APPROVER = "approver"
    EMPLOYEE = "employee"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACTOR = "contractor"
    INTERN = "intern"


class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    ON_LEAVE = "on_leave"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.EMPLOYEE.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    gender = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    zip_code = Column(String(20))

    department_id = Column(Integer, ForeignKey("departments.id"))
    designation_id = Column(Integer, ForeignKey("designations.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    band = Column(String(10))

    employment_type = Column(String(20), default=EmploymentType.FULL_TIME.value)
    status = Column(String(20), default=EmployeeStatus.ACTIVE.value)
    joining_date = Column(DateTime, nullable=False)
    termination_date = Column(DateTime, nullable=True)
    profile_photo = Column(String(500))

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="employee")
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    designation = relationship("Designation", back_populates="employees")
    location = relationship("Location", back_populates="employees")
    manager = relationship("Employee", remote_side="Employee.id", foreign_keys=[manager_id])
    subordinates = relationship("Employee", foreign_keys=[manager_id], overlaps="manager")

    leave_requests = relationship("LeaveRequest", back_populates="employee")
    leave_balances = relationship("LeaveBalance", back_populates="employee")
    salary_history = relationship("SalaryHistory", back_populates="employee", foreign_keys="SalaryHistory.employee_id")
    attendance_records = relationship("AttendanceRecord", back_populates="employee")
    documents = relationship("Document", back_populates="employee", foreign_keys="Document.employee_id")
