from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.misc import OnboardingTask, OffboardingTask
from app.schemas.common import OnboardingTaskCreate, TaskResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/onboarding", tags=["Onboarding/Offboarding"])


@router.get("/tasks/{employee_id}", response_model=list[TaskResponse])
def get_onboarding_tasks(employee_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(OnboardingTask).filter(OnboardingTask.employee_id == employee_id).all()


@router.post("/tasks", response_model=TaskResponse)
def create_onboarding_task(
    req: OnboardingTaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    task = OnboardingTask(**req.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notify the employee about their new onboarding task
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if emp and emp.user_id:
        create_notification(
            db, emp.user_id,
            "New Onboarding Task",
            f"You have a new onboarding task: {req.title}",
            type="system",
            link="/onboarding",
        )

    # Notify assigned person if different from employee
    if req.assigned_to_id and req.assigned_to_id != req.employee_id:
        assigned = db.query(Employee).filter(Employee.id == req.assigned_to_id).first()
        if assigned and assigned.user_id:
            emp_name = f"{emp.first_name} {emp.last_name}" if emp else "a new employee"
            create_notification(
                db, assigned.user_id,
                "Onboarding Task Assigned",
                f"You've been assigned an onboarding task for {emp_name}: {req.title}",
                type="system",
                link="/onboarding",
            )

    return task


@router.put("/tasks/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    task = db.query(OnboardingTask).filter(OnboardingTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed"
    from datetime import datetime, timezone
    task.completed_at = datetime.now(timezone.utc)
    db.commit()

    # Notify HR admins that an onboarding task was completed
    from app.services.notification_service import notify_hr_admins
    emp = db.query(Employee).filter(Employee.id == task.employee_id).first()
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else "An employee"
    notify_hr_admins(
        db,
        title="Onboarding Task Completed",
        message=f"{emp_name} completed: {task.title}",
        type="system",
        link=f"/onboarding",
    )

    return {"message": "Task completed"}


@router.get("/offboarding/{employee_id}", response_model=list[TaskResponse])
def get_offboarding_tasks(employee_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(OffboardingTask).filter(OffboardingTask.employee_id == employee_id).all()
