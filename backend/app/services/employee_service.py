import io
import csv
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User, Employee
from app.core.security import hash_password


def generate_employee_id(db: Session) -> str:
    """Generate next sequential employee ID."""
    last = db.query(Employee).order_by(Employee.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"DS{next_num:05d}"


def search_employees(
    db: Session,
    query: str | None = None,
    department_id: int | None = None,
    status: str | None = None,
    employment_type: str | None = None,
    location_id: int | None = None,
    manager_id: int | None = None,
    page: int = 1,
    per_page: int = 20,
):
    """Search and filter employees with pagination."""
    q = db.query(Employee)

    if query:
        q = q.filter(
            or_(
                Employee.first_name.ilike(f"%{query}%"),
                Employee.last_name.ilike(f"%{query}%"),
                Employee.email.ilike(f"%{query}%"),
                Employee.employee_id.ilike(f"%{query}%"),
            )
        )
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    if status:
        q = q.filter(Employee.status == status)
    if employment_type:
        q = q.filter(Employee.employment_type == employment_type)
    if location_id:
        q = q.filter(Employee.location_id == location_id)
    if manager_id:
        q = q.filter(Employee.manager_id == manager_id)

    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()

    return items, total


def bulk_import_employees(db: Session, csv_content: str, created_by_id: int) -> tuple[int, list[str]]:
    """Import employees from CSV content. Returns (count, errors)."""
    reader = csv.DictReader(io.StringIO(csv_content))
    count = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            email = row.get("email", "").strip()
            if not email:
                errors.append(f"Row {i}: Missing email")
                continue

            existing = db.query(User).filter(User.email == email).first()
            if existing:
                errors.append(f"Row {i}: Email {email} already exists")
                continue

            user = User(
                email=email,
                password_hash=hash_password(row.get("password", "changeme123")),
                role=row.get("role", "employee"),
            )
            db.add(user)
            db.flush()

            emp = Employee(
                user_id=user.id,
                employee_id=generate_employee_id(db),
                first_name=row.get("first_name", "").strip(),
                last_name=row.get("last_name", "").strip(),
                email=email,
                phone=row.get("phone", ""),
                employment_type=row.get("employment_type", "full_time"),
                joining_date=row.get("joining_date", "2026-01-01"),
                department_id=int(row["department_id"]) if row.get("department_id") else None,
                designation_id=int(row["designation_id"]) if row.get("designation_id") else None,
                location_id=int(row["location_id"]) if row.get("location_id") else None,
            )
            db.add(emp)
            count += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return count, errors
