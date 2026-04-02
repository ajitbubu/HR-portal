from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.recruitment import Candidate, JobPosting, OfferLetter, CandidateStatus
from app.models.user import User, Employee
from app.core.security import hash_password
from app.services.employee_service import generate_employee_id
from app.services.notification_service import create_notification, notify_hr_admins
from app.services.audit_service import log_audit


VALID_TRANSITIONS = {
    "applied": ["screening", "rejected", "withdrawn"],
    "screening": ["interview", "rejected", "withdrawn"],
    "interview": ["offer", "rejected", "withdrawn"],
    "offer": ["hired", "rejected", "withdrawn"],
}


def advance_candidate_status(
    db: Session, candidate_id: int, new_status: str, user_id: int | None = None
) -> Candidate:
    """Advance a candidate through the pipeline with validation."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return None

    current = candidate.status
    allowed = VALID_TRANSITIONS.get(current, [])
    if new_status not in allowed:
        raise ValueError(f"Cannot transition from '{current}' to '{new_status}'")

    old_status = candidate.status
    candidate.status = new_status

    log_audit(
        db, user_id, "advance_candidate", "candidate", candidate_id,
        old_values={"status": old_status},
        new_values={"status": new_status},
    )

    if new_status == "hired":
        notify_hr_admins(
            db, "Candidate Hired",
            f"{candidate.first_name} {candidate.last_name} has been hired for posting #{candidate.job_posting_id}",
            type="info", link="/recruitment",
        )

    return candidate


def get_pipeline_stats(db: Session, job_posting_id: int) -> dict:
    """Get candidate count per pipeline stage for a job posting."""
    candidates = db.query(Candidate).filter(
        Candidate.job_posting_id == job_posting_id
    ).all()

    stats = {
        "job_posting_id": job_posting_id,
        "total": len(candidates),
        "applied": 0, "screening": 0, "interview": 0,
        "offer": 0, "hired": 0, "rejected": 0, "withdrawn": 0,
    }
    for c in candidates:
        if c.status in stats:
            stats[c.status] += 1
    return stats


def convert_candidate_to_employee(db: Session, candidate_id: int, user_id: int) -> Employee:
    """Create a User and Employee from a hired candidate."""
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.status == "hired",
    ).first()
    if not candidate:
        raise ValueError("Candidate not found or not in 'hired' status")

    offer = db.query(OfferLetter).filter(
        OfferLetter.candidate_id == candidate_id,
        OfferLetter.status == "accepted",
    ).first()

    posting = db.query(JobPosting).filter(JobPosting.id == candidate.job_posting_id).first()

    # Create user
    user = User(
        email=candidate.email,
        password_hash=hash_password("changeme123"),
        role="employee",
    )
    db.add(user)
    db.flush()

    # Create employee
    emp = Employee(
        user_id=user.id,
        employee_id=generate_employee_id(db),
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=candidate.email,
        phone=candidate.phone,
        department_id=posting.department_id if posting else None,
        location_id=posting.location_id if posting else None,
        joining_date=offer.start_date if offer else datetime.now(timezone.utc).date(),
        status="active",
    )
    db.add(emp)
    db.flush()

    log_audit(db, user_id, "convert_candidate", "candidate", candidate_id,
              new_values={"employee_id": emp.employee_id})

    return emp
