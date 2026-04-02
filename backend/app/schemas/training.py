from datetime import date as Date, datetime
from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    duration_hours: float = 0
    format: str = "online"
    instructor: str | None = None
    max_participants: int = 0
    is_mandatory: bool = False


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    duration_hours: float | None = None
    format: str | None = None
    instructor: str | None = None
    max_participants: int | None = None
    is_mandatory: bool | None = None
    is_active: bool | None = None


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    category: str | None = None
    duration_hours: float
    format: str
    instructor: str | None = None
    max_participants: int
    is_mandatory: bool
    is_active: bool
    created_at: datetime | None = None


class CourseListResponse(BaseModel):
    items: list[CourseResponse]
    total: int
    page: int
    per_page: int


class EnrollmentCreate(BaseModel):
    course_id: int
    employee_id: int | None = None  # None = self-enroll


class EnrollmentUpdate(BaseModel):
    status: str | None = None
    progress: float | None = None
    score: float | None = None


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    course_id: int
    status: str
    enrolled_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    score: float | None = None
    progress: float
    created_at: datetime | None = None


class CertificationCreate(BaseModel):
    name: str
    issuing_body: str | None = None
    description: str | None = None
    validity_months: int = 0


class CertificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    issuing_body: str | None = None
    description: str | None = None
    validity_months: int
    created_at: datetime | None = None


class EmployeeCertificationCreate(BaseModel):
    employee_id: int
    certification_id: int
    issued_date: Date
    expiry_date: Date | None = None
    credential_id: str | None = None


class EmployeeCertificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    certification_id: int
    issued_date: Date
    expiry_date: Date | None = None
    credential_id: str | None = None
    status: str
    created_at: datetime | None = None


class LearningPathCreate(BaseModel):
    name: str
    description: str | None = None
    target_role: str | None = None


class LearningPathCourseCreate(BaseModel):
    course_id: int
    sequence_order: int
    is_required: bool = True


class LearningPathCourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    learning_path_id: int
    course_id: int
    sequence_order: int
    is_required: bool


class LearningPathResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    target_role: str | None = None
    is_active: bool
    courses: list[LearningPathCourseResponse] = []
    created_at: datetime | None = None


class ComplianceAssignmentCreate(BaseModel):
    employee_id: int
    course_id: int
    due_date: Date


class ComplianceAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    course_id: int
    due_date: Date
    completed_at: datetime | None = None
    status: str
    created_at: datetime | None = None
