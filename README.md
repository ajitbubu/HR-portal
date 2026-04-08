# DataSafeguard HR Platform

Enterprise HR Management System built for DataSafeguard.us.

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Python FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL
- **Auth:** JWT with bcrypt, RBAC middleware
- **Deployment:** Docker Compose

## Quick Start (Local — no Docker)

Make sure PostgreSQL is running locally, then:

```bash
# Backend
cd backend
cp .env.example .env          # update DATABASE_URL with your connection string
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

```bash
# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

## Quick Start (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/docs

### Seed Demo Data

```bash
docker-compose exec backend python -m app.utils.seed
```

## Manual Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+

### Database

```bash
createdb datasafeguard_hr
# Or via psql:
psql -c "CREATE DATABASE datasafeguard_hr;"
psql -c "CREATE USER hruser WITH PASSWORD 'hrpass';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE datasafeguard_hr TO hruser;"
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Start server
uvicorn app.main:app --reload --port 8000

# Seed demo data
python -m app.utils.seed
```

### Frontend

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env.local

# Start dev server
npm run dev
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@datasafeguard.us | admin123 |
| HR Admin | hr@datasafeguard.us | hr123 |
| Manager | manager@datasafeguard.us | manager123 |
| Approver | approver@datasafeguard.us | approver123 |
| Employee | employee@datasafeguard.us | employee123 |

## Core Modules

### Fully Implemented
- User authentication & RBAC (5 roles)
- Employee management (CRUD, bulk import, search/filter)
- Leave management (apply, balance check, history, cancel)
- Multi-level leave approval engine (1-3 configurable steps)
- Leave balance tracking (accrual, carry-forward, adjustments)
- Assigned approvers (primary, fallback, delegate)
- Salary history & timeline
- Attendance tracking (check-in/out)
- Holiday calendar management
- Employee directory
- Organization chart
- Document management
- Notifications (in-app)
- Admin panel (departments, policies, workflows, settings)
- Audit logging
- Reports export (CSV)
- Company announcements
- Dashboard & analytics

### Placeholder Modules
- Onboarding/offboarding workflows
- Performance reviews
- HR ticket/helpdesk

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /api/auth/login, POST /api/auth/register, GET /api/auth/me |
| Employees | GET/POST /api/employees, GET/PUT/DELETE /api/employees/{id}, POST /api/employees/bulk-import |
| Leave | GET /api/leave/types, POST /api/leave/apply, GET /api/leave/my-requests, GET /api/leave/balance, GET /api/leave/balance-check, POST /api/leave/{id}/cancel |
| Approvals | GET /api/approvals/pending, POST /api/approvals/{id}/action, GET /api/approvals/history |
| Admin | CRUD /api/admin/departments, /locations, /designations, /teams, /leave-types, /leave-policies, /workflows, /assigned-approvers, /settings |
| Salary | GET /api/salary/history/{id}, POST /api/salary |
| Attendance | POST /api/attendance/check-in, /check-out, GET /api/attendance/my-records |
| Documents | GET /api/documents/{id}, POST /api/documents/upload |
| Notifications | GET /api/notifications, POST /api/notifications/{id}/read |
| Dashboard | GET /api/dashboard/stats |
| Org Chart | GET /api/org-chart |
| Holidays | GET /api/holidays/calendars, POST /api/holidays |
| Reports | GET /api/reports/employees/csv, /leave-summary/csv, /attendance/csv |
| Announcements | GET/POST /api/announcements |
| Audit | GET /api/audit |
| HR Tickets | GET/POST /api/hr-tickets |
| Performance | GET/POST /api/performance |
| Onboarding | GET/POST /api/onboarding/tasks |

## Leave Approval Workflow

The system supports configurable multi-level approval:

1. **Workflow Resolution Order:**
   - Employee-specific assigned approver
   - Department + leave type + band specific workflow
   - Department-level workflow
   - Default workflow (single-step manager approval)

2. **Approval Actions:**
   - Approve (advances to next step or finalizes)
   - Reject (terminates request, restores balance)
   - Send Back (returns to employee for modification)
   - Delegate (reassigns to another approver)

3. **Balance Management:**
   - Real-time balance check before submission
   - Pending balance tracking during approval
   - Automatic deduction on final approval
   - Weekend/holiday exclusion from day count

## Database Schema

25+ tables covering: users, employees, departments, business_units, teams, locations, designations, leave_types, leave_policies, leave_requests, leave_balances, leave_approvals, approval_workflows, approval_workflow_steps, assigned_approvers, salary_history, attendance_records, holiday_calendars, holidays, documents, notifications, audit_logs, announcements, onboarding_tasks, offboarding_tasks, company_settings, performance_reviews, hr_tickets.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # 17 API endpoint modules
│   │   ├── core/              # Config, database, security, dependencies
│   │   ├── middleware/        # RBAC middleware
│   │   ├── models/            # SQLAlchemy models (10 files)
│   │   ├── schemas/           # Pydantic schemas (7 files)
│   │   ├── services/          # Business logic (5 files)
│   │   ├── utils/             # Seed data
│   │   └── main.py            # FastAPI entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # 20+ Next.js pages
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # API client, auth provider
│   │   ├── types/             # TypeScript interfaces
│   │   └── styles/            # Global CSS
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```