from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.models.leave import LeaveBalance, LeaveRequest, LeaveType, LeavePolicy
from app.models.attendance import Holiday, HolidayCalendar
from app.models.user import Employee


def calculate_leave_days(
    db: Session,
    start_date: date,
    end_date: date,
    is_half_day: bool,
    employee: Employee,
    leave_type_id: int,
) -> float:
    """Calculate working days between dates, optionally excluding weekends/holidays."""
    if is_half_day:
        return 0.5

    policy = db.query(LeavePolicy).filter(
        LeavePolicy.leave_type_id == leave_type_id,
        LeavePolicy.is_active == True,
    ).first()

    exclude_weekends = policy.exclude_weekends if policy else True
    exclude_holidays = policy.exclude_holidays if policy else True

    holiday_dates = set()
    if exclude_holidays and employee.location_id:
        calendar = db.query(HolidayCalendar).filter(
            HolidayCalendar.location_id == employee.location_id,
            HolidayCalendar.year == start_date.year,
            HolidayCalendar.is_active == True,
        ).first()
        if calendar:
            holidays = db.query(Holiday).filter(
                Holiday.calendar_id == calendar.id,
                Holiday.is_optional == False,
            ).all()
            holiday_dates = {h.date for h in holidays}

    total = 0.0
    current = start_date
    while current <= end_date:
        if exclude_weekends and current.weekday() >= 5:
            current += timedelta(days=1)
            continue
        if current in holiday_dates:
            current += timedelta(days=1)
            continue
        total += 1
        current += timedelta(days=1)

    return total


def check_leave_balance(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    requested_days: float,
    year: int,
) -> tuple[bool, float, str]:
    """Check if employee has sufficient leave balance. Returns (sufficient, available, message)."""
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year,
    ).first()

    if not balance:
        return False, 0, "No leave balance found for this leave type and year."

    available = balance.entitled + balance.carried_forward + balance.adjusted - balance.used - balance.pending

    policy = db.query(LeavePolicy).filter(
        LeavePolicy.leave_type_id == leave_type_id,
        LeavePolicy.is_active == True,
    ).first()

    if available < requested_days:
        if policy and policy.allow_negative_balance:
            return True, available, f"Insufficient balance ({available} days). Request will be processed as negative balance."
        leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        if leave_type and not leave_type.is_paid:
            return True, available, f"Unpaid leave - balance check bypassed."
        return False, available, f"Insufficient balance. Available: {available} days, Requested: {requested_days} days."

    return True, available, f"Sufficient balance. Available: {available} days."


def update_leave_balance_on_apply(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    days: float,
    year: int,
):
    """Add days to pending when leave is applied."""
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year,
    ).first()
    if balance:
        balance.pending += days
        db.commit()


def update_leave_balance_on_approve(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    days: float,
    year: int,
):
    """Move days from pending to used when leave is approved."""
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year,
    ).first()
    if balance:
        balance.pending = max(0, balance.pending - days)
        balance.used += days
        db.commit()


def update_leave_balance_on_reject(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    days: float,
    year: int,
):
    """Remove days from pending when leave is rejected/cancelled."""
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year,
    ).first()
    if balance:
        balance.pending = max(0, balance.pending - days)
        db.commit()
