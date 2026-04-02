import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.expense import ExpenseCategory, ExpenseClaim, ExpenseItem
from app.schemas.expense import (
    ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse,
    ExpenseClaimCreate, ExpenseClaimUpdate, ExpenseClaimResponse, ExpenseClaimListResponse,
    ExpenseItemCreate, ExpenseItemResponse,
    ExpenseActionRequest, ReimburseRequest, ExpenseSummary,
)
from app.services.expense_service import (
    calculate_claim_total, submit_claim, approve_claim,
    process_reimbursement, get_expense_summary,
)
from app.services.audit_service import log_audit

router = APIRouter(prefix="/expenses", tags=["Expense Management"])


# --- Categories ---

@router.post("/categories", response_model=ExpenseCategoryResponse)
def create_category(
    data: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    cat = ExpenseCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/categories", response_model=list[ExpenseCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ExpenseCategory).filter(ExpenseCategory.is_active == True).all()


@router.put("/categories/{category_id}", response_model=ExpenseCategoryResponse)
def update_category(
    category_id: int,
    data: ExpenseCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


# --- Claims ---

@router.post("/claims", response_model=ExpenseClaimResponse)
def create_claim(
    data: ExpenseClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    claim = ExpenseClaim(employee_id=emp.id, **data.model_dump())
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


@router.get("/claims/pending-approval", response_model=list[ExpenseClaimResponse])
def get_pending_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    mgr_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if current_user.role in ("super_admin", "hr_admin"):
        return db.query(ExpenseClaim).filter(ExpenseClaim.status == "submitted").all()
    if not mgr_emp:
        return []
    subordinate_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == mgr_emp.id).all()]
    return db.query(ExpenseClaim).filter(
        ExpenseClaim.employee_id.in_(subordinate_ids),
        ExpenseClaim.status == "submitted",
    ).all()


@router.get("/claims/my", response_model=ExpenseClaimListResponse)
def get_my_claims(
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return {"items": [], "total": 0, "page": page, "per_page": per_page}
    query = db.query(ExpenseClaim).filter(ExpenseClaim.employee_id == emp.id)
    if status:
        query = query.filter(ExpenseClaim.status == status)
    total = query.count()
    items = query.order_by(ExpenseClaim.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/claims/{claim_id}", response_model=ExpenseClaimResponse)
def get_claim(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if current_user.role not in ("super_admin", "hr_admin"):
        if not emp or claim.employee_id != emp.id:
            mgr_subordinates = [e.id for e in db.query(Employee).filter(Employee.manager_id == (emp.id if emp else -1)).all()]
            if claim.employee_id not in mgr_subordinates:
                raise HTTPException(status_code=403, detail="Not authorized to view this claim")
    return claim


@router.put("/claims/{claim_id}", response_model=ExpenseClaimResponse)
def update_claim(
    claim_id: int,
    data: ExpenseClaimUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Not your claim")
    if claim.status != "draft":
        raise HTTPException(status_code=400, detail="Can only edit draft claims")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(claim, key, value)
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/claims/{claim_id}/submit", response_model=ExpenseClaimResponse)
def submit_expense_claim(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.employee_id != emp.id:
        raise HTTPException(status_code=403, detail="Not your claim")
    try:
        claim = submit_claim(db, claim_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(claim)
    return claim


# --- Items ---

@router.post("/claims/{claim_id}/items", response_model=ExpenseItemResponse)
def add_item(
    claim_id: int,
    data: ExpenseItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.employee_id != emp.id and current_user.role not in ("super_admin", "hr_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if claim.status != "draft":
        raise HTTPException(status_code=400, detail="Can only add items to draft claims")

    item = ExpenseItem(claim_id=claim_id, **data.model_dump())
    db.add(item)
    db.flush()
    calculate_claim_total(db, claim_id)
    db.commit()
    db.refresh(item)
    return item


@router.post("/claims/{claim_id}/items/{item_id}/receipt")
def upload_receipt(
    claim_id: int,
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ExpenseItem).filter(
        ExpenseItem.id == item_id, ExpenseItem.claim_id == claim_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if current_user.role not in ("super_admin", "hr_admin"):
        if not claim or not emp or claim.employee_id != emp.id:
            raise HTTPException(status_code=403, detail="Not authorized to upload receipt for this claim")

    allowed_ext = {"pdf", "jpg", "jpeg", "png"}
    safe_name = os.path.basename(file.filename or "receipt.pdf")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG allowed")

    content = file.file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "receipts")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    item.receipt_path = f"/uploads/receipts/{filename}"
    db.commit()
    return {"receipt_path": item.receipt_path, "message": "Receipt uploaded"}


# --- Approval ---

@router.post("/claims/{claim_id}/action", response_model=ExpenseClaimResponse)
def take_action(
    claim_id: int,
    data: ExpenseActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if current_user.role == "manager":
        mgr_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        subordinate_ids = [e.id for e in db.query(Employee).filter(Employee.manager_id == mgr_emp.id).all()] if mgr_emp else []
        if claim.employee_id not in subordinate_ids:
            raise HTTPException(status_code=403, detail="Not authorized to act on this claim")
    try:
        claim = approve_claim(db, claim_id, current_user.id, data.action, data.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(claim)
    return claim


@router.post("/claims/{claim_id}/reimburse", response_model=ExpenseClaimResponse)
def reimburse_claim(
    claim_id: int,
    data: ReimburseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    try:
        claim = process_reimbursement(db, claim_id, data.amount, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(claim)
    return claim


# --- Reports ---

@router.get("/reports/summary", response_model=list[ExpenseSummary])
def expense_summary_report(
    start_date=None,
    end_date=None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    return get_expense_summary(db, start_date, end_date)
