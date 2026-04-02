import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.recruitment import JobPosting, Candidate, Interview, OfferLetter
from app.schemas.recruitment import (
    JobPostingCreate, JobPostingUpdate, JobPostingResponse, JobPostingListResponse,
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateListResponse,
    CandidateAdvanceRequest,
    InterviewCreate, InterviewUpdate, InterviewFeedback, InterviewResponse,
    OfferLetterCreate, OfferLetterResponse, OfferRespondRequest,
    PipelineStats,
)
from app.services.recruitment_service import advance_candidate_status, get_pipeline_stats
from app.services.audit_service import log_audit
from app.services.notification_service import create_notification

router = APIRouter(prefix="/recruitment", tags=["Recruitment"])


# --- Job Postings ---

@router.post("/postings", response_model=JobPostingResponse)
def create_posting(
    data: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    posting = JobPosting(**data.model_dump(), posted_by_id=emp.id if emp else None)
    db.add(posting)
    db.commit()
    db.refresh(posting)
    log_audit(db, current_user.id, "create_posting", "job_posting", posting.id)
    return posting


@router.get("/postings", response_model=JobPostingListResponse)
def list_postings(
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    query = db.query(JobPosting)
    if status:
        query = query.filter(JobPosting.status == status)
    total = query.count()
    items = query.order_by(JobPosting.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/postings/{posting_id}", response_model=JobPostingResponse)
def get_posting(
    posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return posting


@router.put("/postings/{posting_id}", response_model=JobPostingResponse)
def update_posting(
    posting_id: int,
    data: JobPostingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(posting, key, value)
    db.commit()
    db.refresh(posting)
    return posting


@router.post("/postings/{posting_id}/publish", response_model=JobPostingResponse)
def publish_posting(
    posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    posting.status = "open"
    posting.posted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(posting)
    log_audit(db, current_user.id, "publish_posting", "job_posting", posting.id)
    return posting


@router.post("/postings/{posting_id}/close", response_model=JobPostingResponse)
def close_posting(
    posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    posting.status = "closed"
    db.commit()
    db.refresh(posting)
    return posting


# --- Candidates ---

@router.post("/candidates", response_model=CandidateResponse)
def add_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == data.job_posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    candidate = Candidate(**data.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    log_audit(db, current_user.id, "add_candidate", "candidate", candidate.id)
    return candidate


@router.get("/candidates", response_model=CandidateListResponse)
def list_candidates(
    job_posting_id: int | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    query = db.query(Candidate)
    if job_posting_id:
        query = query.filter(Candidate.job_posting_id == job_posting_id)
    if status:
        query = query.filter(Candidate.status == status)
    total = query.count()
    items = query.order_by(Candidate.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(candidate, key, value)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.post("/candidates/{candidate_id}/advance", response_model=CandidateResponse)
def advance_candidate(
    candidate_id: int,
    data: CandidateAdvanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    try:
        candidate = advance_candidate_status(db, candidate_id, data.status, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.commit()
    db.refresh(candidate)
    return candidate


@router.post("/candidates/{candidate_id}/resume")
def upload_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    allowed_ext = {"pdf", "doc", "docx"}
    safe_name = os.path.basename(file.filename or "resume.pdf")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, DOCX allowed")

    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "resumes")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    candidate.resume_path = f"/uploads/resumes/{filename}"
    db.commit()
    return {"resume_path": candidate.resume_path, "message": "Resume uploaded"}


# --- Interviews ---

@router.post("/interviews", response_model=InterviewResponse)
def schedule_interview(
    data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    candidate = db.query(Candidate).filter(Candidate.id == data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    interview = Interview(**data.model_dump())
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Notify interviewer
    interviewer = db.query(Employee).filter(Employee.id == data.interviewer_id).first()
    if interviewer:
        create_notification(
            db, interviewer.user_id,
            "Interview Scheduled",
            f"Interview with {candidate.first_name} {candidate.last_name} on {data.scheduled_at}",
            type="info", link="/recruitment/interviews",
        )
    return interview


@router.get("/interviews", response_model=list[InterviewResponse])
def list_interviews(
    candidate_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    query = db.query(Interview)
    if candidate_id:
        query = query.filter(Interview.candidate_id == candidate_id)
    if status:
        query = query.filter(Interview.status == status)
    return query.order_by(Interview.scheduled_at.desc()).all()


@router.put("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(interview, key, value)
    db.commit()
    db.refresh(interview)
    return interview


@router.post("/interviews/{interview_id}/feedback", response_model=InterviewResponse)
def submit_feedback(
    interview_id: int,
    data: InterviewFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    interview.feedback = data.feedback
    interview.rating = data.rating
    interview.status = "completed"
    db.commit()
    db.refresh(interview)
    return interview


# --- Offers ---

@router.post("/offers", response_model=OfferLetterResponse)
def create_offer(
    data: OfferLetterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    offer = OfferLetter(**data.model_dump(), generated_by_id=emp.id if emp else None)
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("/offers/{offer_id}", response_model=OfferLetterResponse)
def get_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer


@router.post("/offers/{offer_id}/send", response_model=OfferLetterResponse)
def send_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = "sent"
    offer.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(offer)
    log_audit(db, current_user.id, "send_offer", "offer_letter", offer.id)
    return offer


@router.post("/offers/{offer_id}/respond", response_model=OfferLetterResponse)
def respond_to_offer(
    offer_id: int,
    data: OfferRespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if data.action not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'declined'")
    offer.status = data.action
    offer.responded_at = datetime.now(timezone.utc)

    if data.action == "accepted":
        candidate = db.query(Candidate).filter(Candidate.id == offer.candidate_id).first()
        if candidate:
            candidate.status = "hired"

    db.commit()
    db.refresh(offer)
    return offer


# --- Pipeline ---

@router.get("/pipeline/{posting_id}", response_model=PipelineStats)
def pipeline_stats(
    posting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin", "manager")),
):
    posting = db.query(JobPosting).filter(JobPosting.id == posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return get_pipeline_stats(db, posting_id)
