from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.misc import OnboardingTask, OffboardingTask
from app.schemas.common import OnboardingTaskCreate, TaskResponse

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
    return {"message": "Task completed"}


@router.get("/offboarding/{employee_id}", response_model=list[TaskResponse])
def get_offboarding_tasks(employee_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(OffboardingTask).filter(OffboardingTask.employee_id == employee_id).all()
