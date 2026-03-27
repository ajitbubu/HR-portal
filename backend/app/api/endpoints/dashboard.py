from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

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
