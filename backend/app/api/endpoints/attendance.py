from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.models.attendance import AttendanceRecord
from app.schemas.common import AttendanceCreate, AttendanceResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/check-in")
def check_in(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    today = datetime.now().date()
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == emp.id,
        AttendanceRecord.date == today,
    ).first()

    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    if existing:
        existing.check_in = datetime.now().time()
        existing.status = "present"
    else:
        record = AttendanceRecord(
            employee_id=emp.id,
            date=today,
            check_in=datetime.now().time(),
            status="present",
        )
        db.add(record)
    db.commit()
    return {"message": "Checked in successfully", "time": datetime.now().time().isoformat()}


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
