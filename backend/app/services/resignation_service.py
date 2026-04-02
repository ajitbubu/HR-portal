from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.resignation import ResignationRequest, ResignationActionLog
from app.models.organization import Location
from app.models.misc import OffboardingTask
from app.services.notification_service import create_notification, notify_hr_admins
from app.services.audit_service import log_audit


def get_notice_period_config(employee, db: Session) -> tuple[int, bool, bool]:
    """
    Returns (notice_period_days, is_mandatory, is_india_based) based on employee location.
    India: 90 days, mandatory.
    US: 14 days, not mandatory.
    Fallback: 30 days, not mandatory.
    """
    if employee.location_id:
        loc = db.query(Location).filter(Location.id == employee.location_id).first()
        if loc and loc.country:
            country = loc.country.lower().strip()
            if "india" in country:
                return (90, True, True)
            if "united states" in country or "usa" in country or country == "us":
                return (14, False, False)
    return (30, False, False)


def calculate_last_working_day(start_date: date, notice_days: int) -> date:
    """
    Computes the last working day = start_date + notice_days.
    If it falls on Saturday (weekday=5) → move to Friday.
    If it falls on Sunday (weekday=6) → move to Friday.
    """
    raw = start_date + timedelta(days=notice_days)
    if raw.weekday() == 5:
        return raw - timedelta(days=1)
    if raw.weekday() == 6:
        return raw - timedelta(days=2)
    return raw


def maybe_auto_approve(db: Session, resignation: ResignationRequest) -> bool:
    """
    Lazily checks if the 90-day notice period has expired for a pending India resignation.
    If so, transitions to auto_approved, fires notifications, and commits.
    Returns True if auto-approval was triggered.
    """
    if resignation.status != "pending" or not resignation.is_mandatory:
        return False
    if date.today() < resignation.expected_last_day:
        return False

    old_status = resignation.status
    resignation.status = "auto_approved"
    resignation.actual_last_day = resignation.expected_last_day
    resignation.updated_at = datetime.now(timezone.utc)

    log_entry = ResignationActionLog(
        resignation_id=resignation.id,
        actor_id=None,
        action="auto_approved",
        comments="Notice period expired. Resignation auto-approved by system.",
        old_status=old_status,
        new_status="auto_approved",
    )
    db.add(log_entry)

    # Notify employee
    emp = resignation.employee
    if emp and emp.user_id:
        create_notification(
            db,
            emp.user_id,
            "Resignation Auto-Approved",
            f"Your resignation notice period has ended. Your last working day is confirmed as {resignation.actual_last_day}.",
            type="info",
            link="/resignation",
        )

    # Notify HR admins
    notify_hr_admins(
        db,
        "Resignation Auto-Approved",
        f"{emp.first_name} {emp.last_name}'s resignation has been auto-approved. Last day: {resignation.actual_last_day}.",
        type="info",
        link="/resignation",
    )

    db.commit()
    db.refresh(resignation)
    return True


def mark_completed(db: Session, resignation: ResignationRequest, current_user_id: int):
    """
    HR triggers final offboarding: sets status to completed, updates employee record,
    creates offboarding tasks, and notifies the employee.
    """
    from app.models.user import Employee, EmployeeStatus

    old_status = resignation.status
    resignation.status = "completed"
    resignation.updated_at = datetime.now(timezone.utc)

    # Update employee record
    emp = resignation.employee
    if emp:
        emp.status = EmployeeStatus.TERMINATED.value
        emp.termination_date = datetime.combine(
            resignation.actual_last_day or resignation.expected_last_day,
            datetime.min.time(),
        ).replace(tzinfo=timezone.utc)

    log_entry = ResignationActionLog(
        resignation_id=resignation.id,
        actor_id=current_user_id,
        action="completed",
        comments="Offboarding initiated by HR.",
        old_status=old_status,
        new_status="completed",
    )
    db.add(log_entry)

    # Create standard offboarding tasks assigned to the HR user who triggered this
    from app.models.user import Employee as Emp
    hr_emp = db.query(Emp).filter(Emp.user_id == current_user_id).first()
    hr_emp_id = hr_emp.id if hr_emp else None

    offboarding_items = [
        "Exit Interview",
        "Knowledge Transfer Document",
        "Equipment Return",
        "Access Revocation",
        "Full and Final Settlement",
        "NOC / Experience Letter",
    ]
    for title in offboarding_items:
        task = OffboardingTask(
            employee_id=emp.id if emp else resignation.employee_id,
            title=title,
            assigned_to_id=hr_emp_id,
            status="pending",
            due_date=resignation.actual_last_day or resignation.expected_last_day,
        )
        db.add(task)

    log_audit(db, current_user_id, "complete", "resignation_request", resignation.id)

    # Notify employee
    if emp and emp.user_id:
        create_notification(
            db,
            emp.user_id,
            "Offboarding Initiated",
            "Your resignation has been processed. HR has initiated your offboarding. Please complete the exit checklist.",
            type="info",
            link="/resignation",
        )

    db.commit()
    db.refresh(resignation)
