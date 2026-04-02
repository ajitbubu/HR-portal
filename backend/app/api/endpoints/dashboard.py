from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveApproval
from app.models.attendance import Holiday, HolidayCalendar, AttendanceRecord
from app.models.misc import Announcement, HRTicket
from app.schemas.common import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    total = db.query(Employee).count()
    active = db.query(Employee).filter(Employee.status == "active").count()

    on_leave = db.query(LeaveRequest).filter(
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= today,
        LeaveRequest.end_date >= today,
    ).count()

    # Pending approvals for current user
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    pending = 0
    if emp:
        pending = db.query(LeaveApproval).filter(
            LeaveApproval.approver_id == emp.id,
            LeaveApproval.status == "pending",
        ).count()

    new_hires = db.query(Employee).filter(
        extract("month", Employee.joining_date) == today.month,
        extract("year", Employee.joining_date) == today.year,
    ).count()

    upcoming_holidays = db.query(Holiday).join(HolidayCalendar).filter(
        Holiday.date >= today,
        HolidayCalendar.is_active == True,
    ).count()

    pending_tickets = db.query(HRTicket).filter(HRTicket.status.in_(["open", "in_progress"])).count()
    announcements = db.query(Announcement).filter(Announcement.is_active == True).count()

    # Absentee: active employees who haven't checked in today (weekdays only, excluding those on leave)
    absent_today = 0
    if today.weekday() < 5:  # Mon-Fri only
        checked_in_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.date == today,
        ).count()
        absent_today = max(0, active - checked_in_count - on_leave)

    return DashboardStats(
        total_employees=total,
        active_employees=active,
        on_leave_today=on_leave,
        absent_today=absent_today,
        pending_approvals=pending,
        new_hires_this_month=new_hires,
        upcoming_holidays=upcoming_holidays,
        pending_tickets=pending_tickets,
        announcements_count=announcements,
    )


@router.get("/celebrations")
def get_celebrations(days: int = 30, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns upcoming birthdays and work anniversaries within the next `days` days."""
    today = date.today()
    upcoming: list[dict] = []

    employees = db.query(Employee).filter(Employee.status == "active").all()

    for emp in employees:
        name = f"{emp.first_name} {emp.last_name}"
        photo = emp.profile_photo

        # Birthday
        if emp.date_of_birth:
            dob = emp.date_of_birth.date() if hasattr(emp.date_of_birth, "date") else emp.date_of_birth
            # Next birthday this year or next
            try:
                next_bday = dob.replace(year=today.year)
            except ValueError:
                next_bday = dob.replace(year=today.year, day=28)
            if next_bday < today:
                try:
                    next_bday = dob.replace(year=today.year + 1)
                except ValueError:
                    next_bday = dob.replace(year=today.year + 1, day=28)
            delta = (next_bday - today).days
            if 0 <= delta <= days:
                upcoming.append({
                    "id": emp.id,
                    "name": name,
                    "photo": photo,
                    "type": "birthday",
                    "date": next_bday.isoformat(),
                    "days_away": delta,
                    "label": "🎂 Birthday" if delta > 0 else "🎂 Birthday Today!",
                })

        # Work Anniversary
        if emp.joining_date:
            jd = emp.joining_date.date() if hasattr(emp.joining_date, "date") else emp.joining_date
            try:
                next_anniv = jd.replace(year=today.year)
            except ValueError:
                next_anniv = jd.replace(year=today.year, day=28)
            if next_anniv < today:
                try:
                    next_anniv = jd.replace(year=today.year + 1)
                except ValueError:
                    next_anniv = jd.replace(year=today.year + 1, day=28)
            delta = (next_anniv - today).days
            years = next_anniv.year - jd.year
            if 0 <= delta <= days and years > 0:
                upcoming.append({
                    "id": emp.id,
                    "name": name,
                    "photo": photo,
                    "type": "anniversary",
                    "date": next_anniv.isoformat(),
                    "days_away": delta,
                    "label": f"🏅 {years} Year{'s' if years > 1 else ''} Anniversary" if delta > 0 else f"🏅 {years}yr Anniversary Today!",
                })

    upcoming.sort(key=lambda x: x["days_away"])
    return upcoming
