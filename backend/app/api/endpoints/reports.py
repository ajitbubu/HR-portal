import io
import csv
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.core.database import get_db
from app.core.dependencies import require_roles, get_current_user
from app.models.user import User, Employee
from app.models.leave import LeaveRequest, LeaveBalance, LeaveApproval, LeaveType, CompOffGrant
from app.models.attendance import AttendanceRecord
from app.models.organization import Department, Location, Designation

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
def export_attendance(
    month: int = 3,
    year: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    q = db.query(AttendanceRecord).filter(
        extract("month", AttendanceRecord.date) == month,
        extract("year", AttendanceRecord.date) == year,
    )

    # Managers only see their direct reports
    if current_user.role == "manager":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp:
            direct_report_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
            q = q.filter(AttendanceRecord.employee_id.in_(direct_report_ids))

    records = q.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee ID", "Name", "Date", "Check In", "Check Out", "Hours", "Late Minutes", "Status"])
    for r in records:
        writer.writerow([
            r.employee.employee_id,
            f"{r.employee.first_name} {r.employee.last_name}",
            r.date, r.check_in, r.check_out, r.hours_worked,
            r.late_minutes or 0, r.status,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )


@router.get("/attendance/summary")
def attendance_summary(
    month: int = 3,
    year: int = 2026,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    """Returns daily attendance counts (present/late/absent) for chart rendering."""
    q = db.query(AttendanceRecord).filter(
        extract("month", AttendanceRecord.date) == month,
        extract("year", AttendanceRecord.date) == year,
    )

    if current_user.role == "manager":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp:
            direct_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == emp.id).all()]
            q = q.filter(AttendanceRecord.employee_id.in_(direct_ids))

    records = q.all()

    # Group by date
    summary: dict[str, dict] = {}
    for r in records:
        d = str(r.date)
        if d not in summary:
            summary[d] = {"date": d, "present": 0, "late": 0, "absent": 0}
        if r.status == "present":
            summary[d]["present"] += 1
            if (r.late_minutes or 0) > 0:
                summary[d]["late"] += 1
        elif r.status == "absent":
            summary[d]["absent"] += 1

    return sorted(summary.values(), key=lambda x: x["date"])


@router.get("/headcount")
def headcount_analytics(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin", "manager"))):
    """Returns headcount breakdown by department, location, employment type, and monthly new hires."""
    active = db.query(Employee).filter(Employee.status == "active")

    # By department
    by_dept = (
        db.query(Department.name, func.count(Employee.id))
        .join(Employee, Employee.department_id == Department.id)
        .filter(Employee.status == "active")
        .group_by(Department.name)
        .all()
    )

    # By location
    by_loc = (
        db.query(Location.name, func.count(Employee.id))
        .join(Employee, Employee.location_id == Location.id)
        .filter(Employee.status == "active")
        .group_by(Location.name)
        .all()
    )

    # By employment type
    by_type = (
        db.query(Employee.employment_type, func.count(Employee.id))
        .filter(Employee.status == "active")
        .group_by(Employee.employment_type)
        .all()
    )

    # New hires by month (last 12 months)
    today = date.today()
    monthly_hires = []
    for i in range(11, -1, -1):
        # go back i months
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1) // 12 + (1 if (today.month - i - 1) < 0 else 0))
        count = db.query(Employee).filter(
            extract("month", Employee.joining_date) == m,
            extract("year", Employee.joining_date) == y,
        ).count()
        monthly_hires.append({
            "month": f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} {y}",
            "count": count,
        })

    return {
        "total_active": active.count(),
        "by_department": [{"name": r[0] or "Unassigned", "count": r[1]} for r in by_dept],
        "by_location": [{"name": r[0] or "Unassigned", "count": r[1]} for r in by_loc],
        "by_employment_type": [{"name": (r[0] or "unknown").replace("_", " ").title(), "count": r[1]} for r in by_type],
        "monthly_hires": monthly_hires,
    }


# ══════════════════════════════════════════════════════════════
# Additional Report Types
# ══════════════════════════════════════════════════════════════

@router.get("/pending-approval-aging")
def pending_approval_aging(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Requests pending more than 1, 3, or 7 days — grouped by age bucket."""
    now = datetime.now(timezone.utc)
    pending = db.query(LeaveApproval).filter(LeaveApproval.status == "pending").all()

    buckets = {"1_day": [], "3_days": [], "7_days_plus": []}
    for a in pending:
        lr = db.query(LeaveRequest).filter(LeaveRequest.id == a.leave_request_id, LeaveRequest.status == "pending").first()
        if not lr:
            continue
        ca = a.created_at.replace(tzinfo=None) if a.created_at and a.created_at.tzinfo else a.created_at
        days = (now.replace(tzinfo=None) - ca).days if ca else 0
        emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
        approver = db.query(Employee).filter(Employee.id == a.approver_id).first()
        lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()

        entry = {
            "request_id": lr.id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "leave_type": lt.name if lt else "Leave",
            "dates": f"{lr.start_date} to {lr.end_date}",
            "days_pending": days,
            "approver_name": f"{approver.first_name} {approver.last_name}" if approver else "Unknown",
            "step": a.step_order,
        }
        if days >= 7:
            buckets["7_days_plus"].append(entry)
        elif days >= 3:
            buckets["3_days"].append(entry)
        elif days >= 1:
            buckets["1_day"].append(entry)

    return {
        "summary": {
            "1_day": len(buckets["1_day"]),
            "3_days": len(buckets["3_days"]),
            "7_days_plus": len(buckets["7_days_plus"]),
            "total": sum(len(v) for v in buckets.values()),
        },
        "buckets": buckets,
    }


@router.get("/comp-off-status")
def comp_off_status_report(
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Comp-off breakdown: active, used, expired, pending."""
    grants = db.query(CompOffGrant).all()

    active, used, expired, pending, rejected = [], [], [], [], []
    today = date.today()

    for g in grants:
        emp = db.query(Employee).filter(Employee.id == g.employee_id).first()
        entry = {
            "id": g.id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "work_date": str(g.work_date),
            "days_granted": g.days_granted,
            "status": g.status,
            "expires_at": str(g.expires_at) if g.expires_at else None,
        }
        if g.status == "hr_approved" and g.expires_at and g.expires_at >= today:
            active.append(entry)
        elif g.status == "hr_approved" and g.expires_at and g.expires_at < today:
            expired.append(entry)
        elif g.status in ("used",):
            used.append(entry)
        elif g.status in ("pending", "manager_approved"):
            pending.append(entry)
        elif g.status == "rejected":
            rejected.append(entry)
        elif g.status == "expired":
            expired.append(entry)

    return {
        "summary": {
            "active": len(active),
            "used": len(used),
            "expired": len(expired),
            "pending": len(pending),
            "rejected": len(rejected),
        },
        "active": active,
        "used": used,
        "expired": expired,
        "pending": pending,
    }


@router.get("/team-availability-heatmap")
def team_availability_heatmap(
    month: int = Query(default=None),
    year: int = Query(default=None),
    department_id: int = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    """Calendar heatmap: for each day in the month, how many employees are available vs on leave."""
    import calendar
    today = date.today()
    m = month or today.month
    y = year or today.year

    _, days_in_month = calendar.monthrange(y, m)

    # Get all approved leave for the month
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= date(y, m, days_in_month),
        LeaveRequest.end_date >= date(y, m, 1),
    )
    if department_id:
        dept_emp_ids = [e.id for e in db.query(Employee).filter(Employee.department_id == department_id).all()]
        leaves = leaves.filter(LeaveRequest.employee_id.in_(dept_emp_ids))
    leaves = leaves.all()

    # Count active employees
    emp_q = db.query(Employee).filter(Employee.status == "active")
    if department_id:
        emp_q = emp_q.filter(Employee.department_id == department_id)
    total_employees = emp_q.count()

    # Build day-by-day heatmap
    heatmap = []
    for day in range(1, days_in_month + 1):
        d = date(y, m, day)
        on_leave = 0
        for lr in leaves:
            if lr.start_date <= d <= lr.end_date:
                on_leave += 1
        available = total_employees - on_leave
        heatmap.append({
            "date": str(d),
            "day": day,
            "weekday": d.strftime("%a"),
            "is_weekend": d.weekday() >= 5,
            "on_leave": on_leave,
            "available": available,
            "total": total_employees,
            "availability_pct": round((available / total_employees * 100) if total_employees else 0, 1),
        })

    return {
        "month": m,
        "year": y,
        "total_employees": total_employees,
        "heatmap": heatmap,
    }


@router.get("/leave-utilization")
def leave_utilization(
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Leave usage by leave type and department for the given year."""
    leave_types = db.query(LeaveType).filter(LeaveType.is_active == True).all()
    departments = db.query(Department).all()

    # By leave type
    by_type = []
    for lt in leave_types:
        total_used = db.query(func.sum(LeaveBalance.used)).filter(
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == year,
        ).scalar() or 0
        total_entitled = db.query(func.sum(LeaveBalance.entitled)).filter(
            LeaveBalance.leave_type_id == lt.id,
            LeaveBalance.year == year,
        ).scalar() or 0
        by_type.append({
            "leave_type": lt.name,
            "code": lt.code,
            "total_used": round(float(total_used), 1),
            "total_entitled": round(float(total_entitled), 1),
            "utilization_pct": round((float(total_used) / float(total_entitled) * 100) if total_entitled else 0, 1),
        })

    # By department
    by_department = []
    for dept in departments:
        emp_ids = [e.id for e in db.query(Employee).filter(Employee.department_id == dept.id, Employee.status == "active").all()]
        if not emp_ids:
            continue
        total_used = db.query(func.sum(LeaveBalance.used)).filter(
            LeaveBalance.employee_id.in_(emp_ids),
            LeaveBalance.year == year,
        ).scalar() or 0
        total_entitled = db.query(func.sum(LeaveBalance.entitled)).filter(
            LeaveBalance.employee_id.in_(emp_ids),
            LeaveBalance.year == year,
        ).scalar() or 0
        by_department.append({
            "department": dept.name,
            "total_used": round(float(total_used), 1),
            "total_entitled": round(float(total_entitled), 1),
            "employee_count": len(emp_ids),
        })

    return {"year": year, "by_type": by_type, "by_department": by_department}


@router.get("/pto-balance-summary")
def pto_balance_summary(
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Current leave balances for all employees, flagging low or zero remaining."""
    balances = db.query(LeaveBalance).filter(LeaveBalance.year == year).all()
    result = []
    for b in balances:
        emp = b.employee
        if not emp or emp.status != "active":
            continue
        result.append({
            "employee_id": emp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department.name if emp.department else "",
            "leave_type": b.leave_type.name if b.leave_type else "",
            "entitled": b.entitled,
            "used": b.used,
            "remaining": b.remaining,
            "is_zero": b.remaining <= 0,
            "is_low": 0 < b.remaining <= 2,
        })
    return sorted(result, key=lambda x: x["remaining"])


# ══════════════════════════════════════════════════════════════
# Absenteeism Trends
# ══════════════════════════════════════════════════════════════

@router.get("/absenteeism-trends")
def absenteeism_trends(
    months: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    """Monthly absence rate (% of working days missed) for the last N months, plus breakdown by department."""
    import calendar

    today = date.today()
    total_active = db.query(Employee).filter(Employee.status == "active").count()
    departments = db.query(Department).all()

    monthly = []
    for i in range(months - 1, -1, -1):
        # Compute month offset
        month_offset = (today.month - 1 - i) % 12 + 1
        year_offset = today.year - ((today.month - 1 - i) // 12 + (1 if (today.month - 1 - i) < 0 else 0))
        _, days_in_month = calendar.monthrange(year_offset, month_offset)
        month_start = date(year_offset, month_offset, 1)
        month_end = date(year_offset, month_offset, days_in_month)

        # Working days (Mon–Fri)
        working_days = sum(
            1 for d in range(1, days_in_month + 1)
            if date(year_offset, month_offset, d).weekday() < 5
        )
        if working_days == 0 or total_active == 0:
            monthly.append({"month": month_start.strftime("%b %Y"), "absence_rate": 0.0, "absent_days": 0})
            continue

        # Count approved leave-days that fall within this month
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= month_end,
            LeaveRequest.end_date >= month_start,
        ).all()

        total_absent_days = 0
        for lr in approved_leaves:
            overlap_start = max(lr.start_date, month_start)
            overlap_end = min(lr.end_date, month_end)
            delta = (overlap_end - overlap_start).days + 1
            # Count only working days in overlap
            for d in range(delta):
                day = overlap_start + timedelta(days=d)
                if day.weekday() < 5:
                    total_absent_days += 0.5 if lr.is_half_day else 1

        possible_days = working_days * total_active
        absence_rate = round(total_absent_days / possible_days * 100, 1) if possible_days else 0.0
        monthly.append({
            "month": month_start.strftime("%b %Y"),
            "absence_rate": absence_rate,
            "absent_days": round(total_absent_days, 1),
        })

    # By department — average absence rate across the full period
    by_department = []
    period_start = date(
        today.year - ((today.month - months) // 12 + (1 if (today.month - months) <= 0 else 0)),
        (today.month - months) % 12 + 1 if (today.month - months) % 12 != 0 else 12,
        1,
    ) if months <= today.month else date(today.year - 1, today.month + 12 - months + 1, 1)

    for dept in departments:
        emp_ids = [e.id for e in db.query(Employee).filter(Employee.department_id == dept.id, Employee.status == "active").all()]
        if not emp_ids:
            continue
        dept_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.employee_id.in_(emp_ids),
            LeaveRequest.end_date >= period_start,
        ).all()
        total_absent = sum(
            (min(lr.end_date, today) - lr.start_date).days + 1
            for lr in dept_leaves if lr.start_date <= today
        )
        by_department.append({
            "department": dept.name,
            "absent_days": total_absent,
            "employee_count": len(emp_ids),
            "avg_absent_per_employee": round(total_absent / len(emp_ids), 1),
        })

    return {"monthly": monthly, "by_department": sorted(by_department, key=lambda x: -x["absent_days"])}


# ══════════════════════════════════════════════════════════════
# CSV Bulk Import
# ══════════════════════════════════════════════════════════════

@router.post("/employees/import")
async def import_employees_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Bulk import employees from CSV. Auto-initializes leave balances pro-rated by join date."""
    from app.models.user import User as UserModel
    from app.core.security import hash_password

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    required_fields = {"first_name", "last_name", "email", "employee_id"}
    if not required_fields.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must include columns: {', '.join(required_fields)}. Found: {reader.fieldnames}",
        )

    created = []
    errors = []
    current_year = date.today().year

    for i, row in enumerate(reader, start=2):
        try:
            email = row["email"].strip()
            emp_id = row["employee_id"].strip()

            # Skip if employee already exists
            if db.query(Employee).filter(
                (Employee.email == email) | (Employee.employee_id == emp_id)
            ).first():
                errors.append({"row": i, "error": f"Employee {emp_id} / {email} already exists"})
                continue

            # Resolve department/designation/location by name if provided
            dept_id = None
            if row.get("department"):
                dept = db.query(Department).filter(Department.name == row["department"].strip()).first()
                dept_id = dept.id if dept else None

            desig_id = None
            if row.get("designation"):
                desig = db.query(Designation).filter(Designation.title == row["designation"].strip()).first()
                desig_id = desig.id if desig else None

            loc_id = None
            if row.get("location"):
                loc = db.query(Location).filter(Location.name == row["location"].strip()).first()
                loc_id = loc.id if loc else None

            joining = date.fromisoformat(row["joining_date"].strip()) if row.get("joining_date") else date.today()

            # Create user account
            user = UserModel(
                email=email,
                hashed_password=hash_password("Welcome@123"),
                role=row.get("role", "employee").strip(),
                is_active=True,
            )
            db.add(user)
            db.flush()

            emp = Employee(
                user_id=user.id,
                employee_id=emp_id,
                first_name=row["first_name"].strip(),
                last_name=row["last_name"].strip(),
                email=email,
                phone=row.get("phone", "").strip() or None,
                department_id=dept_id,
                designation_id=desig_id,
                location_id=loc_id,
                employment_type=row.get("employment_type", "full_time").strip(),
                status="active",
                joining_date=joining,
                gender=row.get("gender", "").strip() or None,
            )
            db.add(emp)
            db.flush()

            # Initialize leave balances pro-rated by join month
            months_remaining = 12 - joining.month + 1
            leave_types = db.query(LeaveType).filter(LeaveType.is_active == True).all()
            for lt in leave_types:
                if lt.default_days > 0:
                    prorated = round(lt.default_days * months_remaining / 12, 1)
                    db.add(LeaveBalance(
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        year=current_year,
                        entitled=prorated,
                        used=0, pending=0,
                        carried_forward=0, adjusted=0,
                    ))

            created.append({"employee_id": emp_id, "name": f"{emp.first_name} {emp.last_name}"})
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    db.commit()
    return {
        "imported": len(created),
        "errors": len(errors),
        "created": created,
        "error_details": errors,
    }
