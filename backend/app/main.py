from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api.endpoints import (
    auth, employees, leave, approvals, admin, salary,
    attendance, documents, notifications, dashboard,
    org_chart, announcements, audit, reports, onboarding,
    timesheets, recruitment, training, expenses,
    holidays, hr_tickets, performance, delegations, resignation, wfh,
)

# Create tables
Base.metadata.create_all(bind=engine)


def _seed_defaults():
    from app.core.database import SessionLocal
    from app.models.timesheet import Project
    from app.models.misc import CompanySetting
    db = SessionLocal()
    try:
        # Default projects
        projects = [
            ("UCM",         "UCM",      True),
            ("PIA",         "PIA",      True),
            ("DSAR",        "DSAR",     True),
            ("CDD",         "CDD",      True),
            ("CDR",         "CDR",      True),
            ("DBM",         "DBM",      True),
            ("Tech Debt",   "TECHDEBT", False),
            ("Non-Project", "NONPROJ",  False),
            ("Dev Ops",     "DEVOPS",   False),
        ]
        for name, code, billable in projects:
            if not db.query(Project).filter(Project.code == code).first():
                db.add(Project(name=name, code=code, status="active", is_billable=billable, budget_hours=0))

        # Default feature flags (all enabled)
        features = [
            ("feature.timesheets",   "Timesheet & time tracking"),
            ("feature.leave",        "Leave management"),
            ("feature.resignation",  "Resignation workflow"),
            ("feature.attendance",   "Attendance tracking"),
            ("feature.documents",    "Document management"),
            ("feature.expenses",     "Expense management"),
            ("feature.recruitment",  "Recruitment & hiring"),
            ("feature.training",     "Training & learning"),
            ("feature.performance",  "Performance reviews"),
            ("feature.salary",       "Salary & payroll"),
            ("feature.reports",      "Analytics & reports"),
            ("feature.announcements","Company announcements"),
            ("feature.onboarding",   "Employee onboarding"),
            ("feature.directory",    "Employee directory"),
            ("feature.org_chart",    "Organization chart"),
            ("feature.approvals",    "Approval workflows"),
            ("feature.employees",    "Employee management"),
            ("feature.wfh",          "Work from home"),
        ]
        for key, desc in features:
            if not db.query(CompanySetting).filter(CompanySetting.key == key).first():
                db.add(CompanySetting(key=key, value="true", category="features", description=desc))

        # Default WFH policy
        from app.models.wfh import WFHPolicy
        if not db.query(WFHPolicy).first():
            db.add(WFHPolicy(
                name="Standard WFH Policy",
                max_days_per_week=2,
                max_days_per_month=8,
                min_probation_months=3,
                requires_manager_approval=True,
                is_active=True,
            ))

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


_seed_defaults()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise HR Management Platform for DataSafeguard.us",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start background scheduler
from app.services.scheduler import setup_scheduler
setup_scheduler(app)

# Mount upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
for router in [
    auth.router, employees.router, leave.router, approvals.router,
    admin.router, salary.router, attendance.router, documents.router,
    notifications.router, dashboard.router, org_chart.router,
    announcements.router, audit.router, reports.router,
    onboarding.router, holidays.router, hr_tickets.router,
    timesheets.router, recruitment.router,
    training.router, expenses.router,
    performance.router, delegations.router, resignation.router, wfh.router,
]:
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
