from datetime import date as Date, datetime
from pydantic import BaseModel, ConfigDict


class ExpenseCategoryCreate(BaseModel):
    name: str
    code: str
    description: str | None = None
    max_amount: float = 0
    requires_receipt: bool = True


class ExpenseCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    max_amount: float | None = None
    requires_receipt: bool | None = None
    is_active: bool | None = None


class ExpenseCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None = None
    max_amount: float
    requires_receipt: bool
    is_active: bool
    created_at: datetime | None = None


class ExpenseItemCreate(BaseModel):
    category_id: int
    amount: float
    date: Date
    description: str | None = None
    is_billable: bool = False
    project_id: int | None = None


class ExpenseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    claim_id: int
    category_id: int
    amount: float
    date: Date
    description: str | None = None
    receipt_path: str | None = None
    is_billable: bool
    project_id: int | None = None
    created_at: datetime | None = None


class ExpenseClaimCreate(BaseModel):
    title: str
    description: str | None = None
    currency: str = "USD"


class ExpenseClaimUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class ExpenseClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    title: str
    description: str | None = None
    total_amount: float
    currency: str
    status: str
    submitted_at: datetime | None = None
    approved_by_id: int | None = None
    approved_at: datetime | None = None
    reimbursed_at: datetime | None = None
    reimbursement_amount: float
    rejection_reason: str | None = None
    items: list[ExpenseItemResponse] = []
    created_at: datetime | None = None


class ExpenseClaimListResponse(BaseModel):
    items: list[ExpenseClaimResponse]
    total: int
    page: int
    per_page: int


class ExpenseActionRequest(BaseModel):
    action: str  # approve, reject
    reason: str | None = None


class ReimburseRequest(BaseModel):
    amount: float


class ExpenseSummary(BaseModel):
    category: str
    total_amount: float
    claim_count: int
