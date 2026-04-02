from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    default_days: float = 0
    is_paid: bool = True
    carry_forward: bool = False
    max_carry_forward_days: float = 0
    requires_document: bool = False
    min_days_notice: int = 0
    max_consecutive_days: int = 0
    description: str | None = None


class LeaveTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    default_days: float
    is_paid: bool
    carry_forward: bool
    max_carry_forward_days: float
    requires_document: bool
    is_active: bool


class LeavePolicyCreate(BaseModel):
    name: str
    leave_type_id: int
    accrual_type: str = "annual"
    accrual_amount: float = 0
    max_balance: float = 0
    max_carry_forward: float = 0
    applicable_employment_types: str | None = None
    applicable_bands: str | None = None
    exclude_weekends: bool = True
    exclude_holidays: bool = True
    allow_half_day: bool = True
    allow_negative_balance: bool = False


class LeavePolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    leave_type_id: int
    accrual_type: str
    exclude_weekends: bool
    exclude_holidays: bool
    allow_half_day: bool
    allow_negative_balance: bool
    is_active: bool


class LeaveApplyRequest(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    is_half_day: bool = False
    half_day_type: str | None = None
    reason: str | None = None


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: str | None = None
    leave_type: LeaveTypeResponse | None = None
    start_date: date
    end_date: date
    total_days: float
    is_half_day: bool
    half_day_type: str | None = None
    reason: str | None = None
    attachment_path: str | None = None
    status: str
    current_approval_step: int
    created_at: datetime | None = None
    approvals: list["LeaveApprovalResponse"] = []


class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    leave_type: LeaveTypeResponse
    year: int
    entitled: float
    used: float
    pending: float
    carried_forward: float
    adjusted: float
    remaining: float


class LeaveBalanceAdjust(BaseModel):
    employee_id: int
    leave_type_id: int
    year: int
    adjustment: float
    reason: str


class LeaveBalanceCheckResponse(BaseModel):
    leave_type: str
    available: float
    requested_days: float
    sufficient: bool
    message: str


class LeaveApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    approver_id: int
    approver_name: str | None = None
    step_order: int
    status: str
    comments: str | None = None
    acted_at: datetime | None = None


class ApprovalActionRequest(BaseModel):
    action: str  # approve, reject, send_back, delegate
    comments: str | None = None
    delegate_to_id: int | None = None
