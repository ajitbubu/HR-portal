from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.misc import PerformanceReview
from app.schemas.common import PerformanceReviewCreate, PerformanceReviewResponse

router = APIRouter(prefix="/performance", tags=["Performance Reviews"])


@router.get("/{employee_id}", response_model=list[PerformanceReviewResponse])
def get_reviews(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("super_admin", "hr_admin", "manager"):
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id).all()


@router.post("", response_model=PerformanceReviewResponse)
def create_review(
    req: PerformanceReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    reviewer = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    review = PerformanceReview(
        employee_id=req.employee_id,
        reviewer_id=reviewer.id if reviewer else 1,
        period=req.period,
        rating=req.rating,
        comments=req.comments,
        goals=req.goals,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
