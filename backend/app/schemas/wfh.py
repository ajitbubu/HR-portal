"""WFH request schemas."""
from datetime import date, datetime
from pydantic import BaseModel


class WFHApplyRequest(BaseModel):
    request_date: date
    end_date: date | None = None
    wfh_type: str = "regular"
    reason: str | None = None


class WFHActionRequest(BaseModel):
    comments: str | None = None


class WFHRequestResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    department: str | None = None
    request_date: date
    end_date: date | None = None
    wfh_type: str
    total_days: int
    reason: str | None = None
    status: str
    approved_by: int | None = None
    approver_name: str | None = None
    approver_comments: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class WFHPolicyResponse(BaseModel):
    id: int
    name: str
    max_days_per_week: int
    max_days_per_month: int
    min_probation_months: int
    requires_manager_approval: bool
    is_active: bool

    class Config:
        from_attributes = True


class WFHSummaryResponse(BaseModel):
    total_this_month: int
    total_this_week: int
    max_per_month: int
    max_per_week: int
    remaining_this_month: int
    remaining_this_week: int
