from pydantic import BaseModel


class WorkflowStepCreate(BaseModel):
    step_order: int
    approver_role: str  # manager, department_head, hr_admin, specific
    specific_approver_id: int | None = None


class WorkflowCreate(BaseModel):
    name: str
    department_id: int | None = None
    leave_type_id: int | None = None
    band: str | None = None
    is_default: bool = False
    steps: list[WorkflowStepCreate] = []


class WorkflowStepResponse(BaseModel):
    id: int
    step_order: int
    approver_role: str
    specific_approver_id: int | None = None

    class Config:
        from_attributes = True


class WorkflowResponse(BaseModel):
    id: int
    name: str
    department_id: int | None = None
    leave_type_id: int | None = None
    band: str | None = None
    is_default: bool
    is_active: bool
    steps: list[WorkflowStepResponse] = []

    class Config:
        from_attributes = True


class AssignedApproverCreate(BaseModel):
    employee_id: int
    approver_id: int
    approver_type: str = "primary"
    priority: int = 1


class AssignedApproverResponse(BaseModel):
    id: int
    employee_id: int
    approver_id: int
    approver_type: str
    priority: int
    is_active: bool

    class Config:
        from_attributes = True
