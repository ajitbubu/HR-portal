from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Time, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(Time)
    check_out = Column(Time)
    status = Column(String(20), default="present")  # present, absent, half_day, remote, holiday
    hours_worked = Column(Float, default=0)
    late_minutes = Column(Integer, default=0)
    notes = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="attendance_records")


class HolidayCalendar(Base):
    __tablename__ = "holiday_calendars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    year = Column(Integer, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    holidays = relationship("Holiday", back_populates="calendar")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    calendar_id = Column(Integer, ForeignKey("holiday_calendars.id"), nullable=False)
    name = Column(String(200), nullable=False)
    date = Column(Date, nullable=False)
    is_optional = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    calendar = relationship("HolidayCalendar", back_populates="holidays")
