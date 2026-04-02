from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.training import (
    Course, Enrollment, Certification, EmployeeCertification,
    LearningPath, LearningPathCourse, ComplianceAssignment,
)
from app.schemas.training import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse,
    EnrollmentCreate, EnrollmentUpdate, EnrollmentResponse,
    CertificationCreate, CertificationResponse,
    EmployeeCertificationCreate, EmployeeCertificationResponse,
    LearningPathCreate, LearningPathResponse,
    LearningPathCourseCreate, LearningPathCourseResponse,
    ComplianceAssignmentCreate, ComplianceAssignmentResponse,
)
from app.services.training_service import (
    enroll_employee, update_progress, check_expiring_certifications,
    get_team_training_progress,
)
from app.services.audit_service import log_audit

router = APIRouter(prefix="/training", tags=["Training & Learning"])


# --- Courses ---

@router.post("/courses", response_model=CourseResponse)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    course = Course(**data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    log_audit(db, current_user.id, "create_course", "course", course.id)
    return course


@router.get("/courses", response_model=CourseListResponse)
def list_courses(
    category: str | None = None,
    format: str | None = None,
    mandatory: bool | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Course).filter(Course.is_active == True)
    if category:
        query = query.filter(Course.category == category)
    if format:
        query = query.filter(Course.format == format)
    if mandatory is not None:
        query = query.filter(Course.is_mandatory == mandatory)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return course


# --- Enrollments ---

@router.post("/enrollments", response_model=EnrollmentResponse)
def create_enrollment(
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.employee_id and current_user.role not in ("super_admin", "hr_admin"):
        raise HTTPException(status_code=403, detail="Only HR can enroll others")
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee_id = data.employee_id or emp.id
    try:
        enrollment = enroll_employee(db, employee_id, data.course_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/my", response_model=list[EnrollmentResponse])
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return db.query(Enrollment).filter(Enrollment.employee_id == emp.id).all()


@router.put("/enrollments/{enrollment_id}", response_model=EnrollmentResponse)
def update_enrollment(
    enrollment_id: int,
    data: EnrollmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if enrollment.employee_id != emp.id and current_user.role not in ("super_admin", "hr_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.progress is not None:
        try:
            enrollment = update_progress(db, enrollment_id, data.progress, data.score)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif data.status:
        enrollment.status = data.status

    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/team", response_model=list[dict])
def get_team_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return get_team_training_progress(db, emp.id)


# --- Certifications ---

@router.post("/certifications", response_model=CertificationResponse)
def create_certification(
    data: CertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    cert = Certification(**data.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.get("/certifications", response_model=list[CertificationResponse])
def list_certifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Certification).all()


@router.post("/certifications/assign", response_model=EmployeeCertificationResponse)
def assign_certification(
    data: EmployeeCertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp_cert = EmployeeCertification(**data.model_dump())
    db.add(emp_cert)
    db.commit()
    db.refresh(emp_cert)
    return emp_cert


@router.get("/certifications/my", response_model=list[EmployeeCertificationResponse])
def get_my_certifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return db.query(EmployeeCertification).filter(EmployeeCertification.employee_id == emp.id).all()


@router.get("/certifications/expiring", response_model=list[EmployeeCertificationResponse])
def get_expiring_certifications(
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    return check_expiring_certifications(db, days)


# --- Learning Paths ---

@router.post("/learning-paths", response_model=LearningPathResponse)
def create_learning_path(
    data: LearningPathCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    path = LearningPath(**data.model_dump())
    db.add(path)
    db.commit()
    db.refresh(path)
    return path


@router.get("/learning-paths", response_model=list[LearningPathResponse])
def list_learning_paths(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(LearningPath).filter(LearningPath.is_active == True).all()


@router.get("/learning-paths/{path_id}", response_model=LearningPathResponse)
def get_learning_path(
    path_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return path


@router.post("/learning-paths/{path_id}/courses", response_model=LearningPathCourseResponse)
def add_course_to_path(
    path_id: int,
    data: LearningPathCourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    lpc = LearningPathCourse(learning_path_id=path_id, **data.model_dump())
    db.add(lpc)
    db.commit()
    db.refresh(lpc)
    return lpc


# --- Compliance ---

@router.post("/compliance/assign", response_model=ComplianceAssignmentResponse)
def assign_compliance(
    data: ComplianceAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    assignment = ComplianceAssignment(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if emp and course:
        from app.services.notification_service import create_notification
        create_notification(
            db, emp.user_id,
            "Mandatory Training Assigned",
            f"You must complete '{course.title}' by {data.due_date}",
            type="info", link="/training/my-learning",
        )
    return assignment


@router.get("/compliance/report", response_model=list[ComplianceAssignmentResponse])
def compliance_report(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    query = db.query(ComplianceAssignment)
    if status:
        query = query.filter(ComplianceAssignment.status == status)
    return query.all()
