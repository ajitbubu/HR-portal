from datetime import date, datetime
from pydantic import BaseModel


class ResignationSubmitRequest(BaseModel):
    reason: str
    resignation_date: date | None = None  # defaults to today server-side


class ManagerActionRequest(BaseModel):
    action: str                     # "approve" | "reject" | "modify_last_day"
    comments: str | None = None
    new_last_day: date | None = None  # required when action == "modify_last_day"


class HRNotesRequest(BaseModel):
    hr_notes: str


class NoticePeriodPreview(BaseModel):
    notice_period_days: int
    is_mandatory: bool
    is_india_based: bool
    resignation_date: date
    expected_last_day: date


class ActionLogResponse(BaseModel):
    id: int
    actor_id: int | None
    action: str
    comments: str | None
    old_status: str | None
    new_status: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True


class ResignationResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    employee_code: str | None = None
    manager_name: str | None = None
    department_name: str | None = None
    location_name: str | None = None
    country: str | None = None
    resignation_date: date
    notice_period_days: int
    is_mandatory: bool
    is_india_based: bool
    expected_last_day: date
    actual_last_day: date | None = None
    reason: str | None = None
    status: str
    manager_action: str | None = None
    manager_action_date: datetime | None = None
    manager_comments: str | None = None
    hr_notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    action_logs: list[ActionLogResponse] = []

    class Config:
        from_attributes = True
