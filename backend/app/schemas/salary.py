from datetime import date, datetime
from pydantic import BaseModel


class SalaryCreate(BaseModel):
    employee_id: int
    effective_date: date
    base_pay: float
    bonus: float = 0
    allowance: float = 0
    deduction: float = 0
    currency: str = "USD"
    reason: str | None = None


class SalaryResponse(BaseModel):
    id: int
    employee_id: int
    effective_date: date
    base_pay: float
    bonus: float
    allowance: float
    deduction: float
    total: float
    currency: str
    reason: str | None = None
    changed_by_id: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
