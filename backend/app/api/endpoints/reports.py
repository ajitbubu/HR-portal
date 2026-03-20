import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveBalance
from app.models.attendance import AttendanceRecord

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/employees/csv")
def export_employees_csv(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    employees = db.query(Employee).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee ID", "Name", "Email", "Department", "Designation", "Status", "Employment Type", "Joining Date"])
    for emp in employees:
        writer.writerow([
            emp.employee_id, f"{emp.first_name} {emp.last_name}", emp.email,
            emp.department.name if emp.department else "", emp.designation.title if emp.designation else "",
            emp.status, emp.employment_type, emp.joining_date,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees.csv"},
    )


@router.get("/leave-summary/csv")
def export_leave_summary(year: int = 2026, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    balances = db.query(LeaveBalance).filter(LeaveBalance.year == year).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee ID", "Employee Name", "Leave Type", "Entitled", "Used", "Pending", "Remaining"])
    for b in balances:
        emp = b.employee
        writer.writerow([
            emp.employee_id, f"{emp.first_name} {emp.last_name}",
            b.leave_type.name, b.entitled, b.used, b.pending, b.remaining,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leave_summary.csv"},
    )


@router.get("/attendance/csv")
def export_attendance(month: int = 3, year: int = 2026, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    from sqlalchemy import extract
    records = db.query(AttendanceRecord).filter(
        extract("month", AttendanceRecord.date) == month,
        extract("year", AttendanceRecord.date) == year,
    ).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee ID", "Date", "Check In", "Check Out", "Hours", "Status"])
    for r in records:
        writer.writerow([
            r.employee.employee_id, r.date, r.check_in, r.check_out, r.hours_worked, r.status,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )
