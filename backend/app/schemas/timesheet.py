from datetime import date as Date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    code: str
    client: str | None = None
    description: str | None = None
    status: str = "planning"
    start_date: Date | None = None
    end_date: Date | None = None
    budget_hours: float = 0
    manager_id: int | None = None
    department_id: int | None = None
    is_billable: bool = True


class ProjectUpdate(BaseModel):
    name: str | None = None
    client: str | None = None
    description: str | None = None
    status: str | None = None
    start_date: Date | None = None
    end_date: Date | None = None
    budget_hours: float | None = None
    manager_id: int | None = None
    department_id: int | None = None
    is_billable: bool | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    client: str | None = None
    description: str | None = None
    status: str
    start_date: Date | None = None
    end_date: Date | None = None
    budget_hours: float
    manager_id: int | None = None
    department_id: int | None = None
    is_billable: bool
    created_at: datetime | None = None


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    per_page: int


class ProjectMemberCreate(BaseModel):
    employee_id: int
    role: str = "member"


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    employee_id: int
    role: str
    joined_at: datetime | None = None


class TimesheetEntryCreate(BaseModel):
    project_id: int
    date: Date
    hours: float
    description: str | None = None
    is_billable: bool = True


class TimesheetEntryUpdate(BaseModel):
    project_id: int | None = None
    date: Date | None = None
    hours: float | None = None
    description: str | None = None
    is_billable: bool | None = None


class TimesheetEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    project_id: int
    date: Date
    hours: float
    description: str | None = None
    is_billable: bool
    is_overtime: bool
    status: str
    approved_by_id: int | None = None
    approved_at: datetime | None = None
    created_at: datetime | None = None


class WeeklyTimesheetCreate(BaseModel):
    week_start: Date


class WeeklyTimesheetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    week_start: Date
    week_end: Date
    total_hours: float
    overtime_hours: float
    status: str
    submitted_at: datetime | None = None
    manager_approved_by_id: int | None = None
    manager_approved_at: datetime | None = None
    approved_by_id: int | None = None
    approved_at: datetime | None = None
    comments: str | None = None
    created_at: datetime | None = None


class WeeklyTimesheetListResponse(BaseModel):
    items: list[WeeklyTimesheetResponse]
    total: int
    page: int
    per_page: int


class TimesheetApprovalRequest(BaseModel):
    action: str  # approve, reject
    comments: str | None = None


class ProjectHoursSummary(BaseModel):
    project_id: int
    project_name: str
    total_hours: float
    billable_hours: float
    budget_hours: float
    utilization_pct: float


class EmployeeUtilizationReport(BaseModel):
    employee_id: int
    employee_name: str
    total_hours: float
    billable_hours: float
    available_hours: float
    utilization_pct: float


class OvertimeReport(BaseModel):
    employee_id: int
    employee_name: str
    total_overtime_hours: float
    overtime_entries: int
