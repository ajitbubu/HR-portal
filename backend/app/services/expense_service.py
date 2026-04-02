from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import ExpenseClaim, ExpenseItem, ExpenseCategory
from app.models.user import Employee
from app.services.notification_service import create_notification, notify_hr_admins
from app.services.audit_service import log_audit


def calculate_claim_total(db: Session, claim_id: int) -> float:
    """Sum all items and update the claim total."""
    total = db.query(func.sum(ExpenseItem.amount)).filter(
        ExpenseItem.claim_id == claim_id
    ).scalar() or 0.0
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if claim:
        claim.total_amount = total
    return total


def submit_claim(db: Session, claim_id: int, user_id: int) -> ExpenseClaim:
    """Submit a claim for approval."""
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found")
    if claim.status != "draft":
        raise ValueError("Can only submit draft claims")

    items = db.query(ExpenseItem).filter(ExpenseItem.claim_id == claim_id).all()
    if not items:
        raise ValueError("Cannot submit claim with no items")

    calculate_claim_total(db, claim_id)
    claim.status = "submitted"
    claim.submitted_at = datetime.now(timezone.utc)

    # Notify manager
    emp = db.query(Employee).filter(Employee.id == claim.employee_id).first()
    if emp and emp.manager_id:
        manager = db.query(Employee).filter(Employee.id == emp.manager_id).first()
        if manager:
            create_notification(
                db, manager.user_id,
                "Expense Claim Submitted",
                f"{emp.first_name} {emp.last_name} submitted expense claim: {claim.title} (${claim.total_amount:.2f})",
                type="info", link="/expenses/approvals",
            )

    log_audit(db, user_id, "submit_expense", "expense_claim", claim_id)
    return claim


def approve_claim(
    db: Session, claim_id: int, approver_id: int, action: str, reason: str | None = None
) -> ExpenseClaim:
    """Approve or reject an expense claim."""
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found")
    if claim.status != "submitted":
        raise ValueError("Can only act on submitted claims")

    approver_emp = db.query(Employee).filter(Employee.user_id == approver_id).first()

    if action == "approve":
        claim.status = "approved"
        claim.approved_by_id = approver_emp.id if approver_emp else None
        claim.approved_at = datetime.now(timezone.utc)
        msg = f"Your expense claim '{claim.title}' has been approved"
        notify_hr_admins(
            db, "Expense Approved",
            f"Expense claim '{claim.title}' (${claim.total_amount:.2f}) approved for reimbursement",
            type="info", link="/expenses/approvals",
        )
    else:
        claim.status = "rejected"
        claim.rejection_reason = reason
        msg = f"Your expense claim '{claim.title}' has been rejected. Reason: {reason or 'Not specified'}"

    emp = db.query(Employee).filter(Employee.id == claim.employee_id).first()
    if emp:
        create_notification(db, emp.user_id, f"Expense {action.title()}d", msg, type="info", link="/expenses")

    log_audit(db, approver_id, f"expense_{action}", "expense_claim", claim_id)
    return claim


def process_reimbursement(db: Session, claim_id: int, amount: float, user_id: int) -> ExpenseClaim:
    """Mark a claim as reimbursed."""
    claim = db.query(ExpenseClaim).filter(ExpenseClaim.id == claim_id).first()
    if not claim:
        raise ValueError("Claim not found")
    if claim.status != "approved":
        raise ValueError("Can only reimburse approved claims")

    claim.reimbursement_amount = amount
    claim.reimbursed_at = datetime.now(timezone.utc)
    claim.status = "reimbursed" if amount >= claim.total_amount else "partially_reimbursed"

    emp = db.query(Employee).filter(Employee.id == claim.employee_id).first()
    if emp:
        create_notification(
            db, emp.user_id,
            "Expense Reimbursed",
            f"Your expense claim '{claim.title}' has been reimbursed: ${amount:.2f}",
            type="info", link="/expenses",
        )

    log_audit(db, user_id, "reimburse_expense", "expense_claim", claim_id)
    return claim


def get_expense_summary(db: Session, start_date=None, end_date=None) -> list[dict]:
    """Get expense totals grouped by category."""
    query = db.query(
        ExpenseCategory.name,
        func.sum(ExpenseItem.amount).label("total"),
        func.count(ExpenseItem.id).label("count"),
    ).join(ExpenseItem, ExpenseItem.category_id == ExpenseCategory.id)

    if start_date:
        query = query.filter(ExpenseItem.date >= start_date)
    if end_date:
        query = query.filter(ExpenseItem.date <= end_date)

    results = query.group_by(ExpenseCategory.name).all()
    return [{"category": r.name, "total_amount": r.total or 0, "claim_count": r.count} for r in results]
