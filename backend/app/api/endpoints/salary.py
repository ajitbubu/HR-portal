from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.salary import SalaryHistory
from app.schemas.salary import SalaryCreate, SalaryResponse
from app.services.audit_service import log_audit

router = APIRouter(prefix="/salary", tags=["Salary"])


@router.get("/history/{employee_id}", response_model=list[SalaryResponse])
def get_salary_history(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Employees can see their own; HR/admin can see all
    if current_user.role in ("super_admin", "hr_admin"):
        pass
    else:
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.id != employee_id:
            raise HTTPException(status_code=403, detail="Not authorized")

    records = db.query(SalaryHistory).filter(
        SalaryHistory.employee_id == employee_id
    ).order_by(SalaryHistory.effective_date.desc()).all()
    return records


@router.post("", response_model=SalaryResponse)
def add_salary_record(
    req: SalaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    record = SalaryHistory(
        employee_id=req.employee_id,
        effective_date=req.effective_date,
        base_pay=req.base_pay,
        bonus=req.bonus,
        allowance=req.allowance,
        deduction=req.deduction,
        total=req.base_pay + req.bonus + req.allowance - req.deduction,
        currency=req.currency,
        reason=req.reason,
        changed_by_id=emp.id if emp else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    log_audit(db, current_user.id, "create", "salary_history", record.id)
    return record
