from datetime import date as Date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class JobPostingCreate(BaseModel):
    title: str
    department_id: int | None = None
    location_id: int | None = None
    description: str | None = None
    requirements: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "USD"
    employment_type: str = "full_time"
    positions_count: int = 1


class JobPostingUpdate(BaseModel):
    title: str | None = None
    department_id: int | None = None
    location_id: int | None = None
    description: str | None = None
    requirements: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    employment_type: str | None = None
    status: str | None = None
    positions_count: int | None = None


class JobPostingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    department_id: int | None = None
    location_id: int | None = None
    description: str | None = None
    requirements: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str
    employment_type: str
    status: str
    positions_count: int
    posted_by_id: int | None = None
    posted_at: datetime | None = None
    closes_at: datetime | None = None
    created_at: datetime | None = None


class JobPostingListResponse(BaseModel):
    items: list[JobPostingResponse]
    total: int
    page: int
    per_page: int


class CandidateCreate(BaseModel):
    job_posting_id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    source: str | None = None
    notes: str | None = None


class CandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    source: str | None = None
    notes: str | None = None
    rating: float | None = None


class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_posting_id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    resume_path: str | None = None
    source: str | None = None
    status: str
    notes: str | None = None
    rating: float | None = None
    created_at: datetime | None = None


class CandidateListResponse(BaseModel):
    items: list[CandidateResponse]
    total: int
    page: int
    per_page: int


class CandidateAdvanceRequest(BaseModel):
    status: str


class InterviewCreate(BaseModel):
    candidate_id: int
    interviewer_id: int
    scheduled_at: datetime
    duration_minutes: int = 60
    interview_type: str = "video"
    location: str | None = None
    meeting_link: str | None = None


class InterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    interview_type: str | None = None
    location: str | None = None
    meeting_link: str | None = None
    status: str | None = None


class InterviewFeedback(BaseModel):
    feedback: str
    rating: float | None = None


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    interviewer_id: int
    scheduled_at: datetime
    duration_minutes: int
    interview_type: str
    location: str | None = None
    meeting_link: str | None = None
    feedback: str | None = None
    rating: float | None = None
    status: str
    created_at: datetime | None = None


class OfferLetterCreate(BaseModel):
    candidate_id: int
    position_title: str
    department_id: int | None = None
    salary: float
    salary_currency: str = "USD"
    start_date: Date | None = None
    expiry_date: Date | None = None
    terms: str | None = None


class OfferLetterUpdate(BaseModel):
    position_title: str | None = None
    salary: float | None = None
    start_date: Date | None = None
    expiry_date: Date | None = None
    terms: str | None = None


class OfferLetterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    position_title: str
    department_id: int | None = None
    salary: float
    salary_currency: str
    start_date: Date | None = None
    expiry_date: Date | None = None
    status: str
    terms: str | None = None
    generated_by_id: int | None = None
    sent_at: datetime | None = None
    responded_at: datetime | None = None
    created_at: datetime | None = None


class OfferRespondRequest(BaseModel):
    action: str  # accepted, declined


class PipelineStats(BaseModel):
    job_posting_id: int
    total: int
    applied: int = 0
    screening: int = 0
    interview: int = 0
    offer: int = 0
    hired: int = 0
    rejected: int = 0
    withdrawn: int = 0
