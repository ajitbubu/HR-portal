from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.schemas.common import OrgChartNode

router = APIRouter(prefix="/org-chart", tags=["Organization Chart"])


def build_tree(db: Session, manager_id: int | None) -> list[OrgChartNode]:
    employees = db.query(Employee).filter(Employee.manager_id == manager_id, Employee.status == "active").all()
    nodes = []
    for emp in employees:
        node = OrgChartNode(
            id=emp.id,
            employee_id=emp.employee_id,
            name=f"{emp.first_name} {emp.last_name}",
            designation=emp.designation.title if emp.designation else None,
            department=emp.department.name if emp.department else None,
            profile_photo=emp.profile_photo,
            email=emp.email,
            location=emp.location.name if emp.location else None,
            children=build_tree(db, emp.id),
        )
        nodes.append(node)
    return nodes


@router.get("", response_model=list[OrgChartNode])
def get_org_chart(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Find top-level employees (no manager)
    return build_tree(db, None)
