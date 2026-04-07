from datetime import date, datetime, time
from typing import Any
from pydantic import BaseModel, ConfigDict, field_validator


class AttendanceCreate(BaseModel):
    date: date
    check_in: str | None = None
    check_out: str | None = None
    status: str = "present"
    notes: str | None = None


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    date: date
    check_in: Any = None
    check_out: Any = None
    status: str
    hours_worked: float | None = None
    late_minutes: int = 0
    notes: str | None = None

    @field_validator("check_in", "check_out", mode="before")
    @classmethod
    def serialize_time(cls, v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, time):
            return v.isoformat()
        return str(v)


class HolidayCalendarCreate(BaseModel):
    name: str
    year: int
    location_id: int | None = None


class HolidayCreate(BaseModel):
    calendar_id: int
    name: str
    date: date
    is_optional: bool = False


class HolidayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    date: date
    is_optional: bool


class HolidayCalendarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    year: int
    location_id: int | None = None
    holidays: list[HolidayResponse] = []


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    name: str
    document_type: str | None = None
    file_path: str
    file_size: int | None = None
    description: str | None = None
    created_at: datetime | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: str | None = None
    created_at: datetime | None = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    author_name: str | None = None
    priority: str
    is_active: bool
    created_at: datetime | None = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    action: str
    entity_type: str | None = None
    entity_id: int | None = None
    old_values: str | None = None
    new_values: str | None = None
    ip_address: str | None = None
    created_at: datetime | None = None


class CompanySettingUpdate(BaseModel):
    key: str
    value: str
    category: str | None = None
    description: str | None = None


class CompanySettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    value: str | None = None
    category: str | None = None
    description: str | None = None


class BannerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    type: str
    message: str


class OnboardingTaskCreate(BaseModel):
    employee_id: int
    title: str
    description: str | None = None
    assigned_to_id: int | None = None
    due_date: date | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    title: str
    description: str | None = None
    assigned_to_id: int | None = None
    status: str
    due_date: date | None = None


class HRTicketCreate(BaseModel):
    subject: str
    description: str | None = None
    category: str | None = None
    priority: str = "medium"


class HRTicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    subject: str
    description: str | None = None
    category: str | None = None
    priority: str
    status: str
    assigned_to_id: int | None = None
    resolution: str | None = None
    created_at: datetime | None = None


class PerformanceReviewCreate(BaseModel):
    employee_id: int
    period: str
    rating: float | None = None
    comments: str | None = None
    goals: str | None = None


class PerformanceReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    reviewer_id: int
    period: str
    status: str
    rating: float | None = None
    comments: str | None = None
    created_at: datetime | None = None


class DashboardStats(BaseModel):
    total_employees: int = 0
    active_employees: int = 0
    on_leave_today: int = 0
    absent_today: int = 0
    pending_approvals: int = 0
    new_hires_this_month: int = 0
    upcoming_holidays: int = 0
    pending_tickets: int = 0
    announcements_count: int = 0


class OrgChartNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    name: str
    designation: str | None = None
    department: str | None = None
    profile_photo: str | None = None
    email: str | None = None
    location: str | None = None
    children: list["OrgChartNode"] = []
