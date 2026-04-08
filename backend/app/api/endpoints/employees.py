import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.security import hash_password
from app.models.user import User, Employee
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListResponse,
    DepartmentInfo, DesignationInfo, LocationInfo, ManagerInfo, TeamInfo,
)
from app.services.employee_service import generate_employee_id, search_employees, bulk_import_employees
from app.services.audit_service import log_audit
from app.services.notification_service import create_notification, notify_hr_admins

router = APIRouter(prefix="/employees", tags=["Employees"])


def _to_response(emp: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        employee_id=emp.employee_id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        phone=emp.phone,
        date_of_birth=emp.date_of_birth,
        gender=emp.gender,
        address=emp.address,
        city=emp.city,
        state=emp.state,
        country=emp.country,
        zip_code=emp.zip_code,
        department=DepartmentInfo.model_validate(emp.department) if emp.department else None,
        designation=DesignationInfo.model_validate(emp.designation) if emp.designation else None,
        location=LocationInfo.model_validate(emp.location) if emp.location else None,
        manager=ManagerInfo(
            id=emp.manager.id,
            first_name=emp.manager.first_name,
            last_name=emp.manager.last_name,
            employee_id=emp.manager.employee_id,
        ) if emp.manager else None,
        team=TeamInfo(id=emp.team.id, name=emp.team.name) if emp.team else None,
        direct_reports=[
            ManagerInfo(id=s.id, first_name=s.first_name, last_name=s.last_name, employee_id=s.employee_id)
            for s in (emp.subordinates or [])
        ],
        band=emp.band,
        employment_type=emp.employment_type,
        status=emp.status,
        joining_date=emp.joining_date,
        profile_photo=emp.profile_photo,
        created_at=emp.created_at,
    )


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    q: str | None = None,
    department_id: int | None = None,
    status: str | None = None,
    employment_type: str | None = None,
    location_id: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manager_id = None
    if current_user.role == "manager":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp:
            manager_id = emp.id

    items, total = search_employees(
        db, query=q, department_id=department_id, status=status,
        employment_type=employment_type, location_id=location_id,
        manager_id=manager_id, page=page, per_page=per_page,
    )
    return EmployeeListResponse(
        items=[_to_response(e) for e in items],
        total=total, page=page, per_page=per_page,
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _to_response(emp)


@router.post("", response_model=EmployeeResponse)
def create_employee(
    req: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(email=req.email, password_hash=hash_password(req.password), role=req.role)
    db.add(user)
    db.flush()

    emp = Employee(
        user_id=user.id,
        employee_id=generate_employee_id(db),
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone=req.phone,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        address=req.address,
        city=req.city,
        state=req.state,
        country=req.country,
        zip_code=req.zip_code,
        department_id=req.department_id,
        designation_id=req.designation_id,
        location_id=req.location_id,
        manager_id=req.manager_id,
        band=req.band,
        employment_type=req.employment_type,
        joining_date=req.joining_date,
        profile_photo=req.profile_photo,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    # Welcome notification for the new employee
    create_notification(
        db, user.id,
        "Welcome to the Team!",
        f"Welcome {req.first_name}! Your account has been set up. Please complete your profile and check your onboarding tasks.",
        type="system",
        link="/onboarding",
    )

    # Notify manager about new team member
    if req.manager_id:
        manager = db.query(Employee).filter(Employee.id == req.manager_id).first()
        if manager and manager.user_id:
            create_notification(
                db, manager.user_id,
                "New Team Member",
                f"{req.first_name} {req.last_name} has joined your team.",
                type="system",
                link=f"/employees/{emp.id}",
            )

    # Auto-initialise leave balances (pro-rated by join date)
    from datetime import date as _date
    from app.models.leave import LeaveType as _LeaveType, LeaveBalance as _LeaveBalance
    current_year = _date.today().year
    joining = emp.joining_date if isinstance(emp.joining_date, _date) else _date.fromisoformat(str(emp.joining_date))
    # months remaining in the year (inclusive of joining month)
    months_remaining = 12 - joining.month + 1 if joining.year == current_year else 12
    active_types = db.query(_LeaveType).filter(_LeaveType.is_active == True, _LeaveType.default_days > 0).all()
    for lt in active_types:
        existing = db.query(_LeaveBalance).filter(
            _LeaveBalance.employee_id == emp.id,
            _LeaveBalance.leave_type_id == lt.id,
            _LeaveBalance.year == current_year,
        ).first()
        if not existing:
            prorated = round(lt.default_days * months_remaining / 12, 1)
            db.add(_LeaveBalance(
                employee_id=emp.id, leave_type_id=lt.id,
                year=current_year, entitled=prorated,
                used=0, pending=0, carried_forward=0, adjusted=0,
            ))
    db.commit()

    log_audit(db, current_user.id, "create", "employee", emp.id)
    return _to_response(emp)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    req: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(emp, key, val)
    db.commit()
    db.refresh(emp)

    log_audit(db, current_user.id, "update", "employee", emp.id, new_values=update_data)
    return _to_response(emp)


@router.delete("/{employee_id}")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.status = "inactive"
    user = db.query(User).filter(User.id == emp.user_id).first()
    if user:
        user.is_active = False
    db.commit()
    log_audit(db, current_user.id, "deactivate", "employee", emp.id)
    return {"message": "Employee deactivated"}


@router.post("/profile-photo/upload")
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload profile photo for the current user."""
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit for photos
        raise HTTPException(status_code=400, detail="File size must be under 5MB")

    # Save file with sanitized extension
    safe_name = os.path.basename(file.filename or "photo.jpg")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "profile-photos")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Delete old photo if exists
    if emp.profile_photo:
        old_path = emp.profile_photo.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    # Update employee record
    emp.profile_photo = f"/uploads/profile-photos/{filename}"
    db.commit()

    log_audit(db, current_user.id, "update", "profile_photo", emp.id)
    return {"profile_photo": emp.profile_photo, "message": "Profile photo updated"}


@router.post("/{employee_id}/profile-photo")
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    """Upload profile photo for any employee (admin only)."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be under 5MB")

    safe_name = os.path.basename(file.filename or "photo.jpg")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "profile-photos")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    if emp.profile_photo:
        old_path = emp.profile_photo.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    emp.profile_photo = f"/uploads/profile-photos/{filename}"
    db.commit()

    log_audit(db, current_user.id, "update", "profile_photo", emp.id)
    return {"profile_photo": emp.profile_photo, "message": "Profile photo updated"}


@router.post("/bulk-import")
async def bulk_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    content = (await file.read()).decode("utf-8")
    count, errors = bulk_import_employees(db, content, current_user.id)
    log_audit(db, current_user.id, "bulk_import", "employee", new_values={"count": count})
    return {"imported": count, "errors": errors}
