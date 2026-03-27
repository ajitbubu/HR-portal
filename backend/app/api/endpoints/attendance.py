from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.attendance import AttendanceRecord
from app.schemas.common import AttendanceCreate, AttendanceResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _calc_late_minutes(check_in_time: time) -> int:
    expected = time(settings.WORK_START_HOUR, settings.WORK_START_MINUTE)
    today = date.today()
    delta = datetime.combine(today, check_in_time) - datetime.combine(today, expected)
    return max(0, int(delta.total_seconds() / 60))


@router.post("/check-in")
def check_in(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    today = datetime.now().date()
    now_time = datetime.now().time()
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == emp.id,
        AttendanceRecord.date == today,
    ).first()

    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    late = _calc_late_minutes(now_time)

    if existing:
        existing.check_in = now_time
        existing.status = "present"
        existing.late_minutes = late
    else:
        record = AttendanceRecord(
            employee_id=emp.id,
            date=today,
            check_in=now_time,
            status="present",
            late_minutes=late,
        )
        db.add(record)
    db.commit()
    msg = f"Checked in at {now_time.strftime('%H:%M')}"
    if late > 0:
        msg += f" (late by {late} min)"
    return {"message": msg, "time": now_time.isoformat(), "late_minutes": late}


@router.post("/check-out")
def check_out(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    today = datetime.now().date()
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == emp.id,
        AttendanceRecord.date == today,
    ).first()

    if not record or not record.check_in:
        raise HTTPException(status_code=400, detail="No check-in found for today")

    record.check_out = datetime.now().time()
    check_in_dt = datetime.combine(today, record.check_in)
    check_out_dt = datetime.combine(today, record.check_out)
    record.hours_worked = round((check_out_dt - check_in_dt).total_seconds() / 3600, 2)
    db.commit()
    return {"message": "Checked out", "hours_worked": record.hours_worked}


@router.get("/my-records", response_model=list[AttendanceResponse])
def my_attendance(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []

    q = db.query(AttendanceRecord).filter(AttendanceRecord.employee_id == emp.id)
    if month and year:
        from sqlalchemy import extract
        q = q.filter(
            extract("month", AttendanceRecord.date) == month,
            extract("year", AttendanceRecord.date) == year,
        )
    return q.order_by(AttendanceRecord.date.desc()).limit(60).all()


@router.get("/qr-code/{employee_id}")
def get_qr_code(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a QR code PNG for the given employee ID."""
    try:
        import qrcode
        from qrcode.image.pure import PyPNGImage
    except ImportError:
        raise HTTPException(status_code=500, detail="qrcode library not installed")

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Only allow viewing own QR or if HR/manager
    current_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not (
        current_emp and current_emp.id == employee_id
        or current_user.role in ("super_admin", "hr_admin", "manager")
    ):
        raise HTTPException(status_code=403, detail="Not authorized")

    qr_data = f"DSG-HR-CHECKIN:{emp.employee_id}"
    img = qrcode.make(qr_data, image_factory=PyPNGImage)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@router.post("/qr-checkin")
def qr_check_in_out(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    """Check-in or check-out an employee by scanning their QR code (HR/manager only)."""
    employee_id_str = payload.get("employee_id")
    action = payload.get("action", "in")  # "in" or "out"

    if not employee_id_str:
        raise HTTPException(status_code=400, detail="employee_id required")

    emp = db.query(Employee).filter(Employee.employee_id == employee_id_str).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    today = datetime.now().date()
    now_time = datetime.now().time()

    if action == "in":
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.date == today,
        ).first()
        if existing and existing.check_in:
            raise HTTPException(status_code=400, detail=f"{emp.first_name} already checked in today")

        late = _calc_late_minutes(now_time)
        if existing:
            existing.check_in = now_time
            existing.status = "present"
            existing.late_minutes = late
        else:
            record = AttendanceRecord(
                employee_id=emp.id,
                date=today,
                check_in=now_time,
                status="present",
                late_minutes=late,
            )
            db.add(record)
        db.commit()
        msg = f"{emp.first_name} {emp.last_name} checked in at {now_time.strftime('%H:%M')}"
        if late > 0:
            msg += f" (late by {late} min)"
        return {"message": msg, "late_minutes": late}

    elif action == "out":
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.date == today,
        ).first()
        if not record or not record.check_in:
            raise HTTPException(status_code=400, detail=f"{emp.first_name} hasn't checked in today")
        record.check_out = now_time
        check_in_dt = datetime.combine(today, record.check_in)
        check_out_dt = datetime.combine(today, record.check_out)
        record.hours_worked = round((check_out_dt - check_in_dt).total_seconds() / 3600, 2)
        db.commit()
        return {"message": f"{emp.first_name} {emp.last_name} checked out", "hours_worked": record.hours_worked}

    raise HTTPException(status_code=400, detail="action must be 'in' or 'out'")
