from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles, get_current_user
from app.models.user import User
from app.models.organization import Department, BusinessUnit, Location, Designation, Team
from app.models.leave import LeaveType, LeavePolicy, LeaveBalance
from app.models.workflow import ApprovalWorkflow, ApprovalWorkflowStep, AssignedApprover
from app.models.misc import CompanySetting, FirstApproverPolicy
from app.models.user import Employee
from app.schemas.organization import (
    DepartmentCreate, DepartmentResponse, BusinessUnitCreate, BusinessUnitResponse,
    LocationCreate, LocationResponse, DesignationCreate, DesignationResponse,
    TeamCreate, TeamResponse,
)
from app.schemas.leave import (
    LeaveTypeCreate, LeaveTypeResponse, LeavePolicyCreate, LeavePolicyResponse,
    LeaveBalanceAdjust, FirstApproverPolicyCreate, FirstApproverPolicyResponse,
)
from app.schemas.workflow import (
    WorkflowCreate, WorkflowResponse, AssignedApproverCreate, AssignedApproverResponse,
)
from app.schemas.common import CompanySettingUpdate, CompanySettingResponse, BannerResponse
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["Admin"])

# --- Departments ---
@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(Department).all()


@router.post("/departments", response_model=DepartmentResponse)
def create_department(req: DepartmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    dept = Department(**req.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_audit(db, user.id, "create", "department", dept.id)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, req: DepartmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for k, v in req.model_dump().items():
        setattr(dept, k, v)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}


# --- Business Units ---
@router.get("/business-units", response_model=list[BusinessUnitResponse])
def list_business_units(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(BusinessUnit).all()


@router.post("/business-units", response_model=BusinessUnitResponse)
def create_business_unit(req: BusinessUnitCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    bu = BusinessUnit(**req.model_dump())
    db.add(bu)
    db.commit()
    db.refresh(bu)
    return bu


# --- Locations ---
@router.get("/locations", response_model=list[LocationResponse])
def list_locations(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(Location).all()


@router.post("/locations", response_model=LocationResponse)
def create_location(req: LocationCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    loc = Location(**req.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


# --- Designations ---
@router.get("/designations", response_model=list[DesignationResponse])
def list_designations(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(Designation).all()


@router.post("/designations", response_model=DesignationResponse)
def create_designation(req: DesignationCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    des = Designation(**req.model_dump())
    db.add(des)
    db.commit()
    db.refresh(des)
    return des


# --- Teams ---
@router.get("/teams", response_model=list[TeamResponse])
def list_teams(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(Team).all()


@router.post("/teams", response_model=TeamResponse)
def create_team(req: TeamCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    team = Team(**req.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


# --- Leave Types ---
@router.get("/leave-types", response_model=list[LeaveTypeResponse])
def admin_list_leave_types(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(LeaveType).all()


@router.post("/leave-types", response_model=LeaveTypeResponse)
def create_leave_type(req: LeaveTypeCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    lt = LeaveType(**req.model_dump())
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


@router.put("/leave-types/{leave_type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    leave_type_id: int,
    req: LeaveTypeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")
    for key, val in req.model_dump().items():
        setattr(lt, key, val)
    db.commit()
    db.refresh(lt)
    log_audit(db, user.id, "update", "leave_type", lt.id, new_values=req.model_dump())
    return lt


# --- Leave Policies ---
@router.get("/leave-policies", response_model=list[LeavePolicyResponse])
def list_leave_policies(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(LeavePolicy).all()


@router.post("/leave-policies", response_model=LeavePolicyResponse)
def create_leave_policy(req: LeavePolicyCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    pol = LeavePolicy(**req.model_dump())
    db.add(pol)
    db.commit()
    db.refresh(pol)
    return pol


# --- Leave Balance Adjustment ---
@router.get("/leave-balance/{employee_id}")
def get_employee_leave_balances(
    employee_id: int,
    year: int = 2026,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    from app.schemas.leave import LeaveBalanceResponse, LeaveTypeResponse
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year,
    ).all()
    return [
        LeaveBalanceResponse(
            id=b.id,
            leave_type=LeaveTypeResponse.model_validate(b.leave_type),
            year=b.year, entitled=b.entitled, used=b.used,
            pending=b.pending, carried_forward=b.carried_forward,
            adjusted=b.adjusted, remaining=b.remaining,
        ) for b in balances
    ]


@router.post("/leave-balance/adjust")
def adjust_leave_balance(req: LeaveBalanceAdjust, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == req.employee_id,
        LeaveBalance.leave_type_id == req.leave_type_id,
        LeaveBalance.year == req.year,
    ).first()
    if not balance:
        raise HTTPException(status_code=404, detail="Leave balance not found")
    balance.adjusted += req.adjustment
    db.commit()
    log_audit(db, user.id, "adjust", "leave_balance", balance.id, new_values={"adjustment": req.adjustment, "reason": req.reason})
    return {"message": "Balance adjusted", "new_adjusted": balance.adjusted}


# --- Approval Workflows ---
@router.get("/workflows", response_model=list[WorkflowResponse])
def list_workflows(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(ApprovalWorkflow).all()


@router.post("/workflows", response_model=WorkflowResponse)
def create_workflow(req: WorkflowCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    wf = ApprovalWorkflow(
        name=req.name, department_id=req.department_id,
        leave_type_id=req.leave_type_id, band=req.band, is_default=req.is_default,
    )
    db.add(wf)
    db.flush()
    for step in req.steps:
        s = ApprovalWorkflowStep(
            workflow_id=wf.id, step_order=step.step_order,
            approver_role=step.approver_role, specific_approver_id=step.specific_approver_id,
        )
        db.add(s)
    db.commit()
    db.refresh(wf)
    return wf


# --- Assigned Approvers ---
@router.get("/assigned-approvers", response_model=list[AssignedApproverResponse])
def list_assigned_approvers(employee_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    q = db.query(AssignedApprover)
    if employee_id:
        q = q.filter(AssignedApprover.employee_id == employee_id)
    return q.all()


@router.post("/assigned-approvers", response_model=AssignedApproverResponse)
def assign_approver(req: AssignedApproverCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    aa = AssignedApprover(**req.model_dump())
    db.add(aa)
    db.commit()
    db.refresh(aa)
    return aa


@router.delete("/assigned-approvers/{approver_assignment_id}")
def remove_assigned_approver(approver_assignment_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hr_admin"))):
    aa = db.query(AssignedApprover).filter(AssignedApprover.id == approver_assignment_id).first()
    if not aa:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(aa)
    db.commit()
    return {"message": "Approver assignment removed"}


# --- Company Settings ---
@router.get("/features")
def get_features(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Return feature flags as {module: bool} — any authenticated user can read."""
    rows = db.query(CompanySetting).filter(CompanySetting.category == "features").all()
    return {r.key.replace("feature.", ""): r.value != "false" for r in rows}


@router.get("/banner", response_model=BannerResponse)
def get_banner(db: Session = Depends(get_db)):
    """Public endpoint — no auth required so the banner can show on the login page."""
    def _get(key: str, default: str) -> str:
        row = db.query(CompanySetting).filter(CompanySetting.key == key).first()
        return row.value if (row and row.value is not None) else default

    VALID_TYPES = ("info", "warning", "critical", "success")
    raw_type = _get("banner.type", "info")
    return BannerResponse(
        enabled=_get("banner.enabled", "false") == "true",
        type=raw_type if raw_type in VALID_TYPES else "info",
        message=_get("banner.message", ""),
    )


@router.get("/settings", response_model=list[CompanySettingResponse])
def list_settings(db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    return db.query(CompanySetting).all()


@router.post("/settings", response_model=CompanySettingResponse)
def update_setting(req: CompanySettingUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin"))):
    setting = db.query(CompanySetting).filter(CompanySetting.key == req.key).first()
    if setting:
        setting.value = req.value
        setting.category = req.category
        setting.description = req.description
    else:
        setting = CompanySetting(**req.model_dump())
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


# --- First Approver Policies ---

def _policy_to_response(p: FirstApproverPolicy) -> dict:
    fa_name = None
    if p.fixed_approver:
        fa_name = f"{p.fixed_approver.first_name} {p.fixed_approver.last_name}"
    dept_name = None
    if p.department_id:
        from app.models.organization import Department as Dept
        # relationship not loaded here; just omit — frontend can display id
        dept_name = None
    return {
        "id": p.id,
        "mode": p.mode,
        "fixed_approver_id": p.fixed_approver_id,
        "fixed_approver_name": fa_name,
        "department_id": p.department_id,
        "department_name": dept_name,
        "name": p.name,
        "is_active": p.is_active,
    }


@router.get("/first-approver-policies")
def list_first_approver_policies(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("super_admin", "hr_admin")),
):
    policies = db.query(FirstApproverPolicy).order_by(FirstApproverPolicy.id).all()
    result = []
    for p in policies:
        r = _policy_to_response(p)
        if p.department_id:
            dept = db.query(Department).filter(Department.id == p.department_id).first()
            r["department_name"] = dept.name if dept else None
        result.append(r)
    return result


@router.post("/first-approver-policies")
def create_first_approver_policy(
    req: FirstApproverPolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    VALID_MODES = {"disabled", "employee_choice", "fixed", "manager", "department_head"}
    if req.mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {sorted(VALID_MODES)}")
    if req.mode == "fixed" and not req.fixed_approver_id:
        raise HTTPException(status_code=400, detail="fixed_approver_id is required when mode is 'fixed'")

    policy = FirstApproverPolicy(
        mode=req.mode,
        fixed_approver_id=req.fixed_approver_id,
        department_id=req.department_id,
        name=req.name,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    log_audit(db, user.id, "create", "first_approver_policy", policy.id)
    return _policy_to_response(policy)


@router.put("/first-approver-policies/{policy_id}")
def update_first_approver_policy(
    policy_id: int,
    req: FirstApproverPolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    VALID_MODES = {"disabled", "employee_choice", "fixed", "manager", "department_head"}
    if req.mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {sorted(VALID_MODES)}")
    if req.mode == "fixed" and not req.fixed_approver_id:
        raise HTTPException(status_code=400, detail="fixed_approver_id is required when mode is 'fixed'")

    policy = db.query(FirstApproverPolicy).filter(FirstApproverPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.mode = req.mode
    policy.fixed_approver_id = req.fixed_approver_id
    policy.department_id = req.department_id
    policy.name = req.name
    db.commit()
    db.refresh(policy)
    log_audit(db, user.id, "update", "first_approver_policy", policy.id)
    return _policy_to_response(policy)


@router.delete("/first-approver-policies/{policy_id}")
def delete_first_approver_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    policy = db.query(FirstApproverPolicy).filter(FirstApproverPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(policy)
    db.commit()
    log_audit(db, user.id, "delete", "first_approver_policy", policy_id)
    return {"message": "Policy deleted"}
