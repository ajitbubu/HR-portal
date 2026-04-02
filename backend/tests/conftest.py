"""Test fixtures using SQLite file-based database."""

import os
import warnings

# Set DATABASE_URL BEFORE any app imports so the app uses SQLite
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Suppress httpx deprecation warning from FastAPI TestClient
warnings.filterwarnings("ignore", message=".*shortcut is now deprecated.*Use the explicit style.*")

import pytest
from datetime import date
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import User, Employee
from app.models.organization import Department, Location, Designation, BusinessUnit
from app.models.leave import LeaveType, LeavePolicy, LeaveBalance
from app.models.workflow import ApprovalWorkflow, ApprovalWorkflowStep
from app.models.attendance import HolidayCalendar, Holiday
from app.models.misc import CompanySetting

# SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    # Just remove the file - simpler than trying to drop with FK constraints
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest.fixture(scope="session")
def db():
    """Provide a database session for seeding."""
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="session", autouse=True)
def seed_data(setup_database, db):
    """Seed the test database with essential data."""
    # Business units
    bu = BusinessUnit(name="Technology")
    db.add(bu)
    db.flush()

    # Locations
    loc_sf = Location(name="HQ - San Francisco", city="San Francisco", country="USA")
    loc_ny = Location(name="NYC Office", city="New York", country="USA")
    db.add_all([loc_sf, loc_ny])
    db.flush()

    # Designations
    desig_ceo = Designation(title="CEO", level=10, band="E1")
    desig_mgr = Designation(title="Manager", level=4, band="M2")
    desig_eng = Designation(title="Engineer", level=2, band="IC2")
    desig_hr = Designation(title="HR Manager", level=5, band="M1")
    db.add_all([desig_ceo, desig_mgr, desig_eng, desig_hr])
    db.flush()

    # Departments
    dept_eng = Department(name="Engineering", code="ENG", business_unit_id=bu.id)
    dept_hr = Department(name="Human Resources", code="HR", business_unit_id=bu.id)
    db.add_all([dept_eng, dept_hr])
    db.flush()

    # Users
    admin_user = User(email="admin@test.com", password_hash=hash_password("admin123"), role="super_admin")
    hr_user = User(email="hr@test.com", password_hash=hash_password("hr123"), role="hr_admin")
    mgr_user = User(email="manager@test.com", password_hash=hash_password("mgr123"), role="manager")
    emp_user = User(email="employee@test.com", password_hash=hash_password("emp123"), role="employee")
    db.add_all([admin_user, hr_user, mgr_user, emp_user])
    db.flush()

    # Employees
    admin_emp = Employee(
        user_id=admin_user.id, employee_id="TEST001", first_name="Admin", last_name="User",
        email="admin@test.com", department_id=dept_eng.id, designation_id=desig_ceo.id,
        location_id=loc_sf.id, band="E1", joining_date=date(2020, 1, 1), status="active",
    )
    hr_emp = Employee(
        user_id=hr_user.id, employee_id="TEST002", first_name="HR", last_name="Admin",
        email="hr@test.com", department_id=dept_hr.id, designation_id=desig_hr.id,
        location_id=loc_sf.id, band="M1", joining_date=date(2021, 1, 1), status="active",
    )
    mgr_emp = Employee(
        user_id=mgr_user.id, employee_id="TEST003", first_name="Manager", last_name="Person",
        email="manager@test.com", department_id=dept_eng.id, designation_id=desig_mgr.id,
        location_id=loc_sf.id, band="M2", joining_date=date(2021, 6, 1), status="active",
    )
    emp_emp = Employee(
        user_id=emp_user.id, employee_id="TEST004", first_name="Regular", last_name="Employee",
        email="employee@test.com", department_id=dept_eng.id, designation_id=desig_eng.id,
        location_id=loc_ny.id, band="IC2", joining_date=date(2022, 3, 1), status="active",
    )
    db.add_all([admin_emp, hr_emp, mgr_emp, emp_emp])
    db.flush()

    # Set manager relationships
    mgr_emp.manager_id = admin_emp.id
    emp_emp.manager_id = mgr_emp.id
    hr_emp.manager_id = admin_emp.id
    dept_eng.head_id = admin_emp.id
    dept_hr.head_id = hr_emp.id

    # Leave types
    lt_annual = LeaveType(name="Annual Leave", code="AL", default_days=20, is_paid=True, carry_forward=True, max_carry_forward_days=5)
    lt_sick = LeaveType(name="Sick Leave", code="SL", default_days=12, is_paid=True, carry_forward=False)
    lt_casual = LeaveType(name="Casual Leave", code="CL", default_days=7, is_paid=True, carry_forward=False)
    db.add_all([lt_annual, lt_sick, lt_casual])
    db.flush()

    # Leave policies
    for lt in [lt_annual, lt_sick, lt_casual]:
        db.add(LeavePolicy(
            name=f"{lt.name} Policy", leave_type_id=lt.id,
            accrual_type="annual", exclude_weekends=True, exclude_holidays=True,
            allow_half_day=True, allow_negative_balance=False,
        ))
    db.flush()

    # Leave balances for all employees
    for emp in [admin_emp, hr_emp, mgr_emp, emp_emp]:
        for lt in [lt_annual, lt_sick, lt_casual]:
            db.add(LeaveBalance(
                employee_id=emp.id, leave_type_id=lt.id, year=2026,
                entitled=lt.default_days, used=0, pending=0, carried_forward=0, adjusted=0,
            ))
    db.flush()

    # Default approval workflow (single-step manager approval)
    wf = ApprovalWorkflow(name="Default", is_default=True, is_active=True)
    db.add(wf)
    db.flush()
    db.add(ApprovalWorkflowStep(workflow_id=wf.id, step_order=1, approver_role="manager"))

    # Holiday calendar
    cal = HolidayCalendar(name="US 2026", year=2026, location_id=loc_sf.id)
    db.add(cal)
    db.flush()
    db.add(Holiday(calendar_id=cal.id, name="New Year", date=date(2026, 1, 1)))
    db.add(Holiday(calendar_id=cal.id, name="Christmas", date=date(2026, 12, 25)))

    # Company settings
    db.add(CompanySetting(key="company_name", value="Test Corp", category="general"))

    db.commit()
    yield


@pytest.fixture(scope="session")
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture(scope="session")
def admin_token(client):
    """Get admin JWT token."""
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def hr_token(client):
    """Get HR admin JWT token."""
    res = client.post("/api/auth/login", json={"email": "hr@test.com", "password": "hr123"})
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def mgr_token(client):
    """Get manager JWT token."""
    res = client.post("/api/auth/login", json={"email": "manager@test.com", "password": "mgr123"})
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def emp_token(client):
    """Get employee JWT token."""
    res = client.post("/api/auth/login", json={"email": "employee@test.com", "password": "emp123"})
    return res.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
