from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.timesheet import Project, ProjectMember, TimesheetEntry, WeeklyTimesheet
from app.schemas.timesheet import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    ProjectMemberCreate, ProjectMemberResponse,
    TimesheetEntryCreate, TimesheetEntryUpdate, TimesheetEntryResponse,
    WeeklyTimesheetCreate, WeeklyTimesheetResponse, WeeklyTimesheetListResponse,
    TimesheetApprovalRequest,
    ProjectHoursSummary, EmployeeUtilizationReport, OvertimeReport,
)
from app.services.timesheet_service import (
    auto_flag_overtime, get_project_hours_summary,
    get_employee_utilization, submit_weekly_timesheet, approve_timesheet,
    calculate_daily_hours, calculate_weekly_hours, calculate_weekly_hours_weekdays_only,
)

MAX_DAILY_HOURS = 8.0
MAX_WEEKLY_HOURS = 40.0
from app.services.audit_service import log_audit

router = APIRouter(prefix="/timesheets", tags=["Timesheet & Projects"])


# --- Projects ---

@router.post("/projects", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user.id, "create_project", "project", project.id)
    return project


@router.get("/projects", response_model=ProjectListResponse)
def list_projects(
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    log_audit(db, current_user.id, "update_project", "project", project.id)
    return project


# --- Project Members ---

@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
def add_project_member(
    project_id: int,
    data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.employee_id == data.employee_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee already a member")
    member = ProjectMember(project_id=project_id, **data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()


@router.delete("/projects/{project_id}/members/{employee_id}")
def remove_project_member(
    project_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.employee_id == employee_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}


# --- Timesheet Entries ---

@router.post("/entries", response_model=TimesheetEntryResponse)
def create_entry(
    data: TimesheetEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Enforce daily limit (all days)
    existing_daily = calculate_daily_hours(db, emp.id, data.date)
    if existing_daily + data.hours > MAX_DAILY_HOURS:
        remaining = round(MAX_DAILY_HOURS - existing_daily, 2)
        raise HTTPException(status_code=400, detail=f"Daily limit exceeded. {remaining}h remaining on {data.date}.")

    # Enforce weekly limit only for Mon-Fri (weekends are extra/overtime)
    weekday = data.date.weekday()
    if weekday < 5:
        week_start_d = data.date - timedelta(days=weekday)
        existing_weekly = calculate_weekly_hours_weekdays_only(db, emp.id, week_start_d)
        if existing_weekly + data.hours > MAX_WEEKLY_HOURS:
            remaining = round(MAX_WEEKLY_HOURS - existing_weekly, 2)
            raise HTTPException(status_code=400, detail=f"Weekly limit exceeded. {remaining}h remaining this week.")

    entry = TimesheetEntry(employee_id=emp.id, **data.model_dump())
    db.add(entry)
    db.flush()
    auto_flag_overtime(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/entries/{entry_id}", response_model=TimesheetEntryResponse)
def update_entry(
    entry_id: int,
    data: TimesheetEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    entry = db.query(TimesheetEntry).filter(TimesheetEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Not your entry")
    if entry.status != "draft":
        raise HTTPException(status_code=400, detail="Can only edit draft entries")

    # Enforce daily/weekly limits on hour changes
    if data.hours is not None:
        daily_excl = calculate_daily_hours(db, emp.id, entry.date) - entry.hours
        if daily_excl + data.hours > MAX_DAILY_HOURS:
            remaining = round(MAX_DAILY_HOURS - daily_excl, 2)
            raise HTTPException(status_code=400, detail=f"Daily limit exceeded. {remaining}h remaining on {entry.date}.")
        weekday = entry.date.weekday()
        if weekday < 5:  # Only Mon-Fri weekly cap
            week_start_d = entry.date - timedelta(days=weekday)
            weekly_excl = calculate_weekly_hours_weekdays_only(db, emp.id, week_start_d) - entry.hours
            if weekly_excl + data.hours > MAX_WEEKLY_HOURS:
                remaining = round(MAX_WEEKLY_HOURS - weekly_excl, 2)
                raise HTTPException(status_code=400, detail=f"Weekly limit exceeded. {remaining}h remaining this week.")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    auto_flag_overtime(db, entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}")
def delete_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    entry = db.query(TimesheetEntry).filter(TimesheetEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Not your entry")
    if entry.status != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft entries")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}


@router.get("/my-entries", response_model=list[TimesheetEntryResponse])
def get_my_entries(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    query = db.query(TimesheetEntry).filter(TimesheetEntry.employee_id == emp.id)
    if start_date:
        query = query.filter(TimesheetEntry.date >= start_date)
    if end_date:
        query = query.filter(TimesheetEntry.date <= end_date)
    return query.order_by(TimesheetEntry.date.desc()).all()


# --- Weekly Timesheets ---

@router.post("/weekly/submit", response_model=WeeklyTimesheetResponse)
def submit_weekly(
    data: WeeklyTimesheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    weekly = submit_weekly_timesheet(db, emp.id, data.week_start)
    db.commit()
    db.refresh(weekly)
    return weekly


@router.get("/weekly/my-timesheets", response_model=WeeklyTimesheetListResponse)
def get_my_weekly(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    query = db.query(WeeklyTimesheet).filter(WeeklyTimesheet.employee_id == emp.id)
    total = query.count()
    items = query.order_by(WeeklyTimesheet.week_start.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/weekly/pending-approval", response_model=list[WeeklyTimesheetResponse])
def get_pending_approval(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    mgr_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not mgr_emp:
        return []

    if current_user.role in ("super_admin", "hr_admin"):
        # HR sees timesheets pending their final approval (manager_approved)
        return db.query(WeeklyTimesheet).filter(
            WeeklyTimesheet.status == "manager_approved"
        ).all()

    # Managers see submitted timesheets from their direct reports
    subordinate_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == mgr_emp.id).all()]
    return db.query(WeeklyTimesheet).filter(
        WeeklyTimesheet.employee_id.in_(subordinate_ids),
        WeeklyTimesheet.status == "submitted",
    ).all()


@router.post("/weekly/{weekly_id}/action", response_model=WeeklyTimesheetResponse)
def take_weekly_action(
    weekly_id: int,
    data: TimesheetApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    weekly = db.query(WeeklyTimesheet).filter(WeeklyTimesheet.id == weekly_id).first()
    if not weekly:
        raise HTTPException(status_code=404, detail="Weekly timesheet not found")

    # Validate who can act at each step
    if weekly.status == "submitted":
        if current_user.role not in ("manager", "super_admin", "hr_admin"):
            raise HTTPException(status_code=403, detail="Only managers can approve submitted timesheets")
    elif weekly.status == "manager_approved":
        if current_user.role not in ("super_admin", "hr_admin"):
            raise HTTPException(status_code=403, detail="Only HR can give final approval")
    elif weekly.status not in ("submitted", "manager_approved"):
        raise HTTPException(status_code=400, detail="Timesheet is not awaiting approval")

    result = approve_timesheet(db, weekly_id, current_user.id, data.action, current_user.role, data.comments)
    db.commit()
    db.refresh(result)
    return result


# --- Reports ---

@router.get("/reports/project-hours/{project_id}", response_model=ProjectHoursSummary)
def project_hours_report(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    summary = get_project_hours_summary(db, project_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Project not found")
    return summary


@router.get("/reports/utilization", response_model=list[EmployeeUtilizationReport])
def utilization_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    employees = db.query(Employee).filter(Employee.status == "active").all()
    results = []
    for emp in employees:
        util = get_employee_utilization(db, emp.id, start_date, end_date)
        if util:
            results.append(util)
    return results


@router.get("/reports/overtime", response_model=list[OvertimeReport])
def overtime_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    from sqlalchemy import func
    results = db.query(
        TimesheetEntry.employee_id,
        func.sum(TimesheetEntry.hours).label("total_overtime"),
        func.count(TimesheetEntry.id).label("count"),
    ).filter(
        TimesheetEntry.is_overtime == True,
        TimesheetEntry.date >= start_date,
        TimesheetEntry.date <= end_date,
    ).group_by(TimesheetEntry.employee_id).all()

    reports = []
    for r in results:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        if emp:
            reports.append({
                "employee_id": r.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "total_overtime_hours": r.total_overtime,
                "overtime_entries": r.count,
            })
    return reports
