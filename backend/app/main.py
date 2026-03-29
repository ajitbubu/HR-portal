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
    holidays, hr_tickets, performance, delegations,
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise HR Management Platform for DataSafeguard.us",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    performance.router, delegations.router,
]:
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
