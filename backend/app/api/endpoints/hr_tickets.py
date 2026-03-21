from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.misc import HRTicket
from app.schemas.common import HRTicketCreate, HRTicketResponse
from app.services.notification_service import create_notification, notify_hr_admins

router = APIRouter(prefix="/hr-tickets", tags=["HR Tickets"])


@router.get("", response_model=list[HRTicketResponse])
def list_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role in ("super_admin", "hr_admin"):
        return db.query(HRTicket).order_by(HRTicket.created_at.desc()).limit(100).all()
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    return db.query(HRTicket).filter(HRTicket.employee_id == emp.id).order_by(HRTicket.created_at.desc()).all()


@router.post("", response_model=HRTicketResponse)
def create_ticket(req: HRTicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    ticket = HRTicket(employee_id=emp.id, **req.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Notify HR admins about the new ticket
    notify_hr_admins(
        db,
        title="New HR Ticket",
        message=f"{emp.first_name} {emp.last_name} submitted: {req.subject}",
        type="system",
        link="/hr-tickets",
    )

    return ticket


@router.put("/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int, status: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    ticket = db.query(HRTicket).filter(HRTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = status
    db.commit()

    # Notify the ticket creator about the status change
    emp = db.query(Employee).filter(Employee.id == ticket.employee_id).first()
    if emp and emp.user_id:
        create_notification(
            db, emp.user_id,
            "HR Ticket Updated",
            f"Your ticket \"{ticket.subject}\" has been updated to: {status}",
            type="system",
            link="/hr-tickets",
        )

    return {"message": "Ticket updated"}
