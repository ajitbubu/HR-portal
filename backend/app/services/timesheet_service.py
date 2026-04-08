from datetime import date, timedelta, datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.timesheet import TimesheetEntry, WeeklyTimesheet, Project
from app.models.user import Employee
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit


def calculate_daily_hours(db: Session, employee_id: int, target_date: date) -> float:
    """Get total hours logged by an employee on a specific date."""
    result = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.employee_id == employee_id,
        TimesheetEntry.date == target_date,
    ).scalar()
    return result or 0.0


def calculate_weekly_hours(db: Session, employee_id: int, week_start: date) -> float:
    """Get total hours logged by an employee in a week (Mon-Sun)."""
    week_end = week_start + timedelta(days=6)
    result = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.employee_id == employee_id,
        TimesheetEntry.date >= week_start,
        TimesheetEntry.date <= week_end,
    ).scalar()
    return result or 0.0


def calculate_weekly_hours_weekdays_only(db: Session, employee_id: int, week_start: date) -> float:
    """Get total Mon-Fri hours logged by an employee in a week (excludes weekends)."""
    from app.models.timesheet import TimesheetEntry as TE
    week_end = week_start + timedelta(days=4)  # Friday
    result = db.query(func.sum(TE.hours)).filter(
        TE.employee_id == employee_id,
        TE.date >= week_start,
        TE.date <= week_end,
    ).scalar()
    return result or 0.0


def auto_flag_overtime(db: Session, entry: TimesheetEntry):
    """Flag an entry as overtime if it is on a weekend, daily > 8, or weekday weekly > 40."""
    weekday = entry.date.weekday()

    # Weekend entries are always overtime
    if weekday >= 5:
        entry.is_overtime = True
        return

    # Check daily total (Mon-Fri)
    daily_total = calculate_daily_hours(db, entry.employee_id, entry.date)
    if daily_total > 8:
        entry.is_overtime = True
        return

    # Check Mon-Fri weekly total
    week_start = entry.date - timedelta(days=weekday)
    weekly_total = calculate_weekly_hours_weekdays_only(db, entry.employee_id, week_start)
    if weekly_total > 40:
        entry.is_overtime = True
        return

    entry.is_overtime = False


def get_project_hours_summary(db: Session, project_id: int) -> dict:
    """Get hours summary for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {}

    total = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.project_id == project_id,
    ).scalar() or 0.0

    billable = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.project_id == project_id,
        TimesheetEntry.is_billable == True,
    ).scalar() or 0.0

    return {
        "project_id": project_id,
        "project_name": project.name,
        "total_hours": total,
        "billable_hours": billable,
        "budget_hours": project.budget_hours or 0,
        "utilization_pct": round((total / project.budget_hours * 100), 1) if project.budget_hours else 0,
    }


def get_employee_utilization(
    db: Session, employee_id: int, start_date: date, end_date: date
) -> dict:
    """Calculate employee utilization for a date range."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return {}

    total = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.employee_id == employee_id,
        TimesheetEntry.date >= start_date,
        TimesheetEntry.date <= end_date,
    ).scalar() or 0.0

    billable = db.query(func.sum(TimesheetEntry.hours)).filter(
        TimesheetEntry.employee_id == employee_id,
        TimesheetEntry.date >= start_date,
        TimesheetEntry.date <= end_date,
        TimesheetEntry.is_billable == True,
    ).scalar() or 0.0

    # Calculate working days (Mon-Fri) in range
    working_days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            working_days += 1
        current += timedelta(days=1)
    available_hours = working_days * 8.0

    return {
        "employee_id": employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}",
        "total_hours": total,
        "billable_hours": billable,
        "available_hours": available_hours,
        "utilization_pct": round((total / available_hours * 100), 1) if available_hours else 0,
    }


def submit_weekly_timesheet(db: Session, employee_id: int, week_start: date) -> WeeklyTimesheet:
    """Create/submit a weekly timesheet by aggregating daily entries."""
    week_end = week_start + timedelta(days=6)

    entries = db.query(TimesheetEntry).filter(
        TimesheetEntry.employee_id == employee_id,
        TimesheetEntry.date >= week_start,
        TimesheetEntry.date <= week_end,
        TimesheetEntry.status == "draft",
    ).all()

    total_hours = sum(e.hours for e in entries)
    overtime_hours = sum(e.hours for e in entries if e.is_overtime)

    # Mark entries as submitted
    for entry in entries:
        entry.status = "submitted"

    weekly = WeeklyTimesheet(
        employee_id=employee_id,
        week_start=week_start,
        week_end=week_end,
        total_hours=total_hours,
        overtime_hours=overtime_hours,
        status="submitted",
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(weekly)
    db.flush()

    # Notify manager
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp and emp.manager_id:
        manager = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if manager:
            create_notification(
                db, manager.user_id,
                "Timesheet Submitted",
                f"{emp.first_name} {emp.last_name} submitted timesheet for week of {week_start}",
                type="info",
                link="/timesheets/approvals",
            )

    return weekly


def approve_timesheet(
    db: Session, weekly_id: int, approver_id: int, action: str,
    approver_role: str = "manager", comments: str | None = None
) -> WeeklyTimesheet:
    """Two-step approval: manager → manager_approved → HR → approved."""
    weekly = db.query(WeeklyTimesheet).filter(WeeklyTimesheet.id == weekly_id).first()
    if not weekly:
        return None

    approver_emp = db.query(Employee).filter(Employee.user_id == approver_id).first()
    emp = db.query(Employee).filter(Employee.id == weekly.employee_id).first()

    if action == "reject":
        weekly.status = "rejected"
        weekly.comments = comments
        # Revert entries to draft
        revert_statuses = ["submitted", "manager_approved"]
        entries = db.query(TimesheetEntry).filter(
            TimesheetEntry.employee_id == weekly.employee_id,
            TimesheetEntry.date >= weekly.week_start,
            TimesheetEntry.date <= weekly.week_end,
            TimesheetEntry.status.in_(revert_statuses),
        ).all()
        for entry in entries:
            entry.status = "draft"

        if emp:
            create_notification(
                db, emp.user_id,
                "Timesheet Rejected",
                f"Your timesheet was rejected. Comments: {comments or 'None'}",
                type="warning",
                link="/timesheets",
            )
        log_audit(db, approver_id, "timesheet_reject", "weekly_timesheet", weekly_id)
        return weekly

    # APPROVE action
    if weekly.status == "submitted":
        # Step 1: Manager approval → forward to HR
        weekly.status = "manager_approved"
        weekly.manager_approved_by_id = approver_emp.id if approver_emp else None
        weekly.manager_approved_at = datetime.now(timezone.utc)

        # Notify all HR admins
        from app.models.user import User as UserModel
        hr_users = db.query(UserModel).filter(
            UserModel.role.in_(["hr_admin", "super_admin"])
        ).all()
        approver_name = f"{approver_emp.first_name} {approver_emp.last_name}" if approver_emp else "Manager"
        emp_name = f"{emp.first_name} {emp.last_name}" if emp else f"Employee #{weekly.employee_id}"
        for hr in hr_users:
            create_notification(
                db, hr.id,
                "Timesheet Awaiting HR Approval",
                f"{approver_name} approved {emp_name}'s timesheet for week of {weekly.week_start}. Pending your final approval.",
                type="info",
                link="/timesheets/approvals",
            )

    elif weekly.status == "manager_approved":
        # Step 2: HR final approval
        weekly.status = "approved"
        weekly.approved_by_id = approver_emp.id if approver_emp else None
        weekly.approved_at = datetime.now(timezone.utc)
        weekly.comments = comments

        # Approve all entries
        entries = db.query(TimesheetEntry).filter(
            TimesheetEntry.employee_id == weekly.employee_id,
            TimesheetEntry.date >= weekly.week_start,
            TimesheetEntry.date <= weekly.week_end,
            TimesheetEntry.status == "submitted",
        ).all()
        for entry in entries:
            entry.status = "approved"
            entry.approved_by_id = approver_emp.id if approver_emp else None
            entry.approved_at = datetime.now(timezone.utc)

        if emp:
            create_notification(
                db, emp.user_id,
                "Timesheet Approved",
                f"Your timesheet for week of {weekly.week_start} has been fully approved.",
                type="success",
                link="/timesheets",
            )

    log_audit(db, approver_id, f"timesheet_{action}", "weekly_timesheet", weekly_id)
    return weekly
