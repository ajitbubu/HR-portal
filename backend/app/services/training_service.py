from datetime import datetime, date, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.training import Course, Enrollment, EmployeeCertification, ComplianceAssignment
from app.models.user import Employee
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit


def enroll_employee(db: Session, employee_id: int, course_id: int) -> Enrollment:
    """Enroll an employee in a course, checking capacity."""
    course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
    if not course:
        raise ValueError("Course not found or inactive")

    existing = db.query(Enrollment).filter(
        Enrollment.employee_id == employee_id,
        Enrollment.course_id == course_id,
        Enrollment.status.in_(["enrolled", "in_progress"]),
    ).first()
    if existing:
        raise ValueError("Already enrolled in this course")

    if course.max_participants > 0:
        current_count = db.query(Enrollment).filter(
            Enrollment.course_id == course_id,
            Enrollment.status.in_(["enrolled", "in_progress"]),
        ).count()
        if current_count >= course.max_participants:
            raise ValueError("Course is full")

    enrollment = Enrollment(employee_id=employee_id, course_id=course_id)
    db.add(enrollment)
    db.flush()

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp:
        create_notification(
            db, emp.user_id,
            "Course Enrollment",
            f"You have been enrolled in '{course.title}'",
            type="info", link="/training/my-learning",
        )

    return enrollment


def update_progress(db: Session, enrollment_id: int, progress: float, score: float | None = None) -> Enrollment:
    """Update enrollment progress. Auto-completes at 100%."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise ValueError("Enrollment not found")

    enrollment.progress = progress
    if score is not None:
        enrollment.score = score

    if enrollment.status == "enrolled" and progress > 0:
        enrollment.status = "in_progress"
        enrollment.started_at = datetime.now(timezone.utc)

    if progress >= 100:
        enrollment.status = "completed"
        enrollment.completed_at = datetime.now(timezone.utc)
        enrollment.progress = 100

        # Check if this completes a compliance assignment
        assignment = db.query(ComplianceAssignment).filter(
            ComplianceAssignment.employee_id == enrollment.employee_id,
            ComplianceAssignment.course_id == enrollment.course_id,
            ComplianceAssignment.status == "pending",
        ).first()
        if assignment:
            assignment.status = "completed"
            assignment.completed_at = datetime.now(timezone.utc)

    return enrollment


def check_overdue_compliance(db: Session) -> list[ComplianceAssignment]:
    """Find and mark overdue compliance assignments."""
    today = date.today()
    overdue = db.query(ComplianceAssignment).filter(
        ComplianceAssignment.status == "pending",
        ComplianceAssignment.due_date < today,
    ).all()

    for assignment in overdue:
        assignment.status = "overdue"
        emp = db.query(Employee).filter(Employee.id == assignment.employee_id).first()
        if emp:
            course = db.query(Course).filter(Course.id == assignment.course_id).first()
            create_notification(
                db, emp.user_id,
                "Overdue Training",
                f"Your mandatory training '{course.title if course else 'Unknown'}' is overdue",
                type="info", link="/training/my-learning",
            )

    return overdue


def get_team_training_progress(db: Session, manager_id: int) -> list[dict]:
    """Get training progress for a manager's subordinates."""
    subordinates = db.query(Employee).filter(Employee.manager_id == manager_id).all()
    results = []
    for emp in subordinates:
        enrollments = db.query(Enrollment).filter(Enrollment.employee_id == emp.id).all()
        completed = sum(1 for e in enrollments if e.status == "completed")
        results.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "total_enrollments": len(enrollments),
            "completed": completed,
            "in_progress": sum(1 for e in enrollments if e.status == "in_progress"),
        })
    return results


def check_expiring_certifications(db: Session, days_ahead: int = 30) -> list[EmployeeCertification]:
    """Find certifications expiring within the specified days."""
    cutoff = date.today() + timedelta(days=days_ahead)
    return db.query(EmployeeCertification).filter(
        EmployeeCertification.status == "active",
        EmployeeCertification.expiry_date != None,
        EmployeeCertification.expiry_date <= cutoff,
    ).all()
