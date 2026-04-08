# DataSafeguard HR Portal

Enterprise HR Management System built for DataSafeguard.us — covering the full employee lifecycle from onboarding through offboarding, with multi-level leave approvals, time tracking, recruitment, training, and rich admin tooling.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Quick Start — Docker](#quick-start--docker)
3. [Local Development (no Docker)](#local-development-no-docker)
4. [Environment Variables](#environment-variables)
5. [Email Configuration (SMTP)](#email-configuration-smtp)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Leave Approval Workflow](#leave-approval-workflow)
9. [Production Deployment](#production-deployment)
10. [Project Structure](#project-structure)
11. [Demo Credentials](#demo-credentials)
12. [Feature Modules](#feature-modules)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose), bcrypt, RBAC (5 roles) |
| Email | fastapi-mail (SMTP — Gmail / SES / any provider) |
| Scheduler | APScheduler 3.x (background cron jobs) |
| Container | Docker, Docker Compose |
| Reverse Proxy | Nginx (production) |

---

## Quick Start — Docker

```bash
git clone https://github.com/ajitbubu/HR-portal.git
cd HR-portal
docker compose up --build -d
```

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8000/api> |
| API Docs (Swagger) | <http://localhost:8000/docs> |
| Mailpit (email preview) | <http://localhost:8025> |

### Seed demo data

```bash
docker compose exec backend python -m app.utils.seed
```

### Rebuild after code changes

```bash
docker compose build frontend   # or backend
docker compose up -d
```

---

## Local Development (no Docker)

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+

### 1 — Database

```bash
psql -U postgres -c "CREATE DATABASE datasafeguard_hr;"
psql -U postgres -c "CREATE USER hruser WITH PASSWORD 'hrpass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE datasafeguard_hr TO hruser;"
```

### 2 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit DATABASE_URL and SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

Seed data (separate terminal, with venv active):

```bash
python -m app.utils.seed
```

### 3 — Frontend

```bash
cd frontend
npm install
# Create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing key — use a long random string in production |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token lifetime (8 hours) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed origins — JSON array |
| `APP_BASE_URL` | `http://localhost:3000` | Used to build email deep-link URLs |
| `MAIL_ENABLED` | `false` | Set `true` to send real emails |
| `MAIL_SERVER` | `mailpit` | SMTP host |
| `MAIL_PORT` | `1025` | SMTP port |
| `MAIL_USERNAME` | — | SMTP username |
| `MAIL_PASSWORD` | — | SMTP password |
| `MAIL_FROM` | `hr@datasafeguard.ai` | Sender address |
| `MAIL_FROM_NAME` | `DataSafeguard HR` | Sender display name |
| `MAIL_STARTTLS` | `false` | Use STARTTLS (port 587) |
| `MAIL_SSL_TLS` | `false` | Use SSL/TLS (port 465) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API base URL |

---

## Email Configuration (SMTP)

The system sends emails for every approval event:

| Trigger | Recipient | Includes |
| --- | --- | --- |
| Leave applied | L1 Approver (direct manager) | Approve ✓ / Reject ✗ inline buttons |
| Leave applied | L2 Manager | FYI notification (no buttons) |
| Step N approved → step N+1 | Next approver | Approve ✓ / Reject ✗ inline buttons |
| All steps approved | Employee | Approval confirmation |
| Rejected | Employee | Rejection notice + manager comments |
| Sent back | Employee | Revision request + manager comments |
| Delegated | Delegate | Approve ✓ / Reject ✗ inline buttons |
| Pending reminder | Approver | Reminder after 1, 3, 7 days |

### Gmail SMTP

```bash
# In backend/.env or docker-compose.yml:
MAIL_ENABLED=true
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx   # Gmail App Password (not your login password)
MAIL_FROM=your@gmail.com
MAIL_STARTTLS=true
MAIL_SSL_TLS=false
APP_BASE_URL=https://your-domain.com
```

> Generate an App Password at <https://myaccount.google.com/apppasswords> (requires 2FA enabled).

### Amazon SES

```bash
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=<SES SMTP username>
MAIL_PASSWORD=<SES SMTP password>
MAIL_STARTTLS=true
```

### Local testing with Mailpit

```bash
# Mailpit is already in docker-compose.yml
docker compose up -d mailpit
# Set in docker-compose.yml:
MAIL_ENABLED=true
MAIL_SERVER=mailpit
MAIL_PORT=1025
```

Open <http://localhost:8025> to see all captured emails with full HTML rendering.

---

## Database Schema

35+ tables across these logical groups:

### Core HR

| Table | Description |
| --- | --- |
| `users` | Auth accounts (email, password_hash, role) |
| `employees` | Employee profiles (personal, employment, org) |
| `departments` | Business departments with head |
| `teams` | Sub-teams within departments |
| `designations` | Job titles and bands |
| `locations` | Office locations (city, country) |
| `business_units` | Top-level org units |

### Leave Management

| Table | Description |
| --- | --- |
| `leave_types` | EL, SL, PL, Maternity, etc. with carry-forward rules |
| `leave_policies` | Accrual rules per leave type (monthly/annual, cap) |
| `leave_requests` | Individual leave applications |
| `leave_balances` | Per-employee, per-type, per-year balances |
| `leave_approvals` | Each approval step record |
| `comp_off_grants` | Comp-off credits with expiry |
| `approval_workflows` | Configurable multi-step chains |
| `first_approver_policies` | First-approver mode (fixed/manager/dept_head/choice) |
| `delegation_settings` | Out-of-office delegation rules |

### Work & Time

| Table | Description |
| --- | --- |
| `wfh_requests` | Work-from-home applications |
| `wfh_policies` | WFH quota and eligibility rules |
| `projects` | Billable/internal projects |
| `timesheet_entries` | Daily hours per project |
| `attendance_records` | Check-in/out records |

### Expenses & Finance

| Table | Description |
| --- | --- |
| `expense_categories` | Category definitions with max amounts |
| `expense_claims` | Expense reports with line items |
| `salary_history` | Salary changes over time |

### Recruitment & Training

| Table | Description |
| --- | --- |
| `job_postings` | Open positions |
| `candidates` | Applicant profiles |
| `interviews` | Interview schedules and results |
| `offer_letters` | Offer details and status |
| `courses` | Training course catalog |
| `enrollments` | Employee course enrolments |
| `certifications` | Certificate definitions |
| `employee_certifications` | Employee certificate records |
| `compliance_assignments` | Mandatory training assignments |

### Org & System

| Table | Description |
| --- | --- |
| `announcements` | Company-wide announcements |
| `notifications` | In-app notification inbox |
| `audit_logs` | Full system activity log |
| `documents` | Uploaded HR documents |
| `onboarding_tasks` | New hire task checklists |
| `performance_reviews` | Review cycles and ratings |
| `hr_tickets` | Internal helpdesk tickets |
| `company_settings` | Key-value feature flags and config |
| `holidays` | Holiday calendars per region/country |

---

## API Reference

| Module | Base path | Key endpoints |
| --- | --- | --- |
| Auth | `/api/auth` | `POST /login`, `POST /register`, `GET /me` |
| Employees | `/api/employees` | CRUD, `POST /bulk-import`, `GET /search` |
| Leave | `/api/leave` | `POST /apply`, `GET /balance`, `GET /my-requests`, `GET /calendar`, `GET /first-approver-config` |
| Approvals | `/api/approvals` | `GET /pending`, `POST /{id}/action`, `GET /history` |
| Comp-Off | `/api/leave/comp-off` | `POST /apply`, `GET /my-grants`, `POST /approvals/{id}/action` |
| WFH | `/api/wfh` | `POST /apply`, `GET /my-requests`, `POST /approvals/{id}/action` |
| Admin | `/api/admin` | Depts, teams, workflows, first-approver policies, feature flags, balance adjustments |
| Timesheets | `/api/timesheets` | Weekly grid, project hours, `GET /reports/utilization` |
| Expenses | `/api/expenses` | Claims CRUD, `POST /approve`, `GET /reports` |
| Recruitment | `/api/recruitment` | Job postings, candidates, interviews, offers |
| Training | `/api/training` | Courses, enrollments, certifications, compliance |
| Resignation | `/api/resignation` | Apply, notice preview, status |
| Salary | `/api/salary` | `GET /history/{employee_id}`, `POST /` |
| Attendance | `/api/attendance` | `POST /check-in`, `POST /check-out`, `GET /my-records` |
| Reports | `/api/reports` | 9 report types, CSV exports |
| Notifications | `/api/notifications` | `GET /`, `POST /{id}/read`, `GET /unread-count` |
| Holidays | `/api/holidays` | Calendar CRUD, holiday CRUD |
| Announcements | `/api/announcements` | CRUD, `GET /active` |
| Org Chart | `/api/org-chart` | `GET /` hierarchy tree |
| Dashboard | `/api/dashboard` | `GET /stats`, `GET /celebrations` |
| Audit | `/api/audit` | `GET /` paginated log |
| Documents | `/api/documents` | Upload, download, categorize |
| Delegations | `/api/delegations` | Set/clear OOO delegate |
| Onboarding | `/api/onboarding` | Tasks CRUD |
| Performance | `/api/performance` | Reviews CRUD |

Full interactive docs: <http://localhost:8000/docs>

---

## Leave Approval Workflow

### Resolution chain

When a leave request is submitted, the system resolves who approves it in this order:

1. **First Approver Policy** — admin-configurable per department:
   - `disabled` — no first approver
   - `fixed` — always the same person
   - `manager` — employee's reporting manager
   - `department_head` — head of the employee's department
   - `employee_choice` — employee selects from eligible approvers
2. **Workflow matching** — the approval chain is chosen by best specificity:
   - Department + leave type + band → department + leave type → department only → default workflow
3. **Delegation** — if any approver has an active OOO delegation, requests auto-route to their delegate
4. **CEO rule** — designation level 1 (CEO) requests auto-approve with no chain

### Approval actions

| Action | Effect |
| --- | --- |
| Approve | Advances to next step, or finalises if last step |
| Reject | Terminates request, restores pending balance |
| Send Back | Returns to employee for modification |
| Delegate | Reassigns current step to another approver |

### Email deep links

Every approval email contains inline **Approve** and **Reject** buttons signed with a JWT token (72-hour expiry). Clicking them calls `GET /api/leave/approve-via-email?token=...` — no login required.

See `diagrams/approval-flow.mmd` for the full flowchart.

---

## Production Deployment

### Architecture

```
Internet
  │
  ▼
Nginx (port 80/443 — SSL termination)
  ├──▶ Frontend  Next.js  :3000
  └──▶ Backend   FastAPI  :8000
                     │
                     ▼
              PostgreSQL :5432
```

### Step 1 — Server requirements

- Ubuntu 22.04 LTS (or similar)
- 2 vCPU, 4 GB RAM minimum (8 GB recommended)
- 40 GB SSD
- Docker 24+ and Docker Compose v2 installed

### Step 2 — Clone and configure

```bash
git clone https://github.com/ajitbubu/HR-portal.git /opt/hr-portal
cd /opt/hr-portal
```

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```bash
DATABASE_URL=postgresql://hruser:STRONG_PASSWORD@db:5432/datasafeguard_hr
SECRET_KEY=$(openssl rand -hex 32)          # generate a strong key
CORS_ORIGINS=["https://your-domain.com"]
APP_BASE_URL=https://your-domain.com

MAIL_ENABLED=true
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=hr@your-domain.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=hr@your-domain.com
MAIL_STARTTLS=true
```

### Step 3 — Update docker-compose for production

Edit `docker-compose.yml` — update the backend `environment` section with the values from `.env`, and change the frontend build arg:

```yaml
frontend:
  build:
    context: ./frontend
    args:
      NEXT_PUBLIC_API_URL: https://your-domain.com/api
```

Also remove the `mailpit` service from production (or keep it internal-only).

### Step 4 — Build and start

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend python -m app.utils.seed
```

### Step 5 — Nginx configuration

Install Nginx on the host:

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/hr-portal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 20M;

    # Frontend (Next.js)
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass         http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # File uploads
    location /uploads/ {
        proxy_pass         http://localhost:8000/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hr-portal /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
sudo nginx -t && sudo systemctl reload nginx
```

### Step 6 — SSL certificate auto-renewal

```bash
sudo crontab -e
# Add:
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

### Step 7 — PostgreSQL backups

```bash
# Add to crontab — daily backup at 2 AM
0 2 * * * docker compose -f /opt/hr-portal/docker-compose.prod.yml \
  exec -T db pg_dump -U hruser datasafeguard_hr \
  > /backups/hr-portal-$(date +\%Y\%m\%d).sql
```

### Step 8 — Health monitoring

```bash
# Check all services are running
docker compose ps

# View backend logs
docker compose logs backend --tail=100

# View frontend logs
docker compose logs frontend --tail=50

# Check email delivery
docker compose logs backend | grep -i "email\|mail"
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/endpoints/      # 25 FastAPI routers
│   │   ├── core/               # Config, database, security, dependencies
│   │   ├── middleware/         # RBAC middleware
│   │   ├── models/             # SQLAlchemy models (17 files, 35+ tables)
│   │   ├── schemas/            # Pydantic v2 schemas
│   │   ├── services/           # Business logic (12 service files)
│   │   │   ├── approval_service.py    # Workflow resolution + email triggers
│   │   │   ├── email_service.py       # SMTP send + HTML builders + JWT tokens
│   │   │   ├── notification_service.py# In-app + email notification fanout
│   │   │   └── scheduler.py           # APScheduler cron jobs
│   │   └── utils/seed.py       # Demo data seeder
│   ├── tests/                  # pytest test suite (excluded from Docker build)
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # 35+ Next.js pages
│   │   ├── components/layout/  # Sidebar, Header, DashboardLayout
│   │   ├── contexts/           # Auth, Features, Banner, Sidebar contexts
│   │   ├── hooks/              # useApi, custom hooks
│   │   ├── lib/                # api.ts, auth.tsx
│   │   ├── middleware.ts        # Next.js server-side route protection
│   │   └── types/              # TypeScript interfaces
│   ├── e2e/                    # Playwright end-to-end tests (excluded from Docker build)
│   ├── playwright.config.ts
│   ├── Dockerfile
│   └── package.json
├── diagrams/                   # Mermaid architecture diagrams
│   ├── architecture.mmd
│   ├── component-diagram.mmd
│   ├── data-model.mmd
│   ├── leave-flow.mmd
│   ├── approval-flow.mmd
│   └── auth-flow.mmd
├── doc/
│   ├── planned.md              # Feature tracker (Phase 1–6)
│   └── diagrams/architecture.md
├── nginx/nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## Demo Credentials

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | admin@datasafeguard.us | admin123 |
| HR Admin | hr@datasafeguard.us | hr123 |
| Manager | manager@datasafeguard.us | manager123 |
| Approver | approver@datasafeguard.us | approver123 |
| Employee | employee@datasafeguard.us | employee123 |

---

## Feature Modules

| Module | Description | Roles |
| --- | --- | --- |
| Dashboard | Role-aware stats, quick actions, celebrations | All |
| Leave Management | Apply, balance check, half-day, medical cert, history | All |
| Leave Approvals | Multi-level approve/reject/send-back/delegate | Manager, Approver, HR |
| Comp-Off | Apply for worked overtime, 2-level approval, credit | All |
| WFH | Work-from-home requests with quota bars | All |
| Org Leave Balance | Team leave utilisation charts (Recharts) | Manager, HR, Admin |
| Attendance | Check-in/out, daily records | All |
| Timesheets | Weekly project hours, billable tracking | All |
| Expenses | Claims, line items, receipt upload, approval | All |
| Recruitment | Job postings, candidates, interviews, offers | Manager, HR |
| Training | Course catalog, enrollments, certifications | All |
| Resignation | Resignation workflow with notice period | All |
| Salary History | Pay timeline and grade changes | HR, Admin |
| Employees | Directory, CRUD, bulk CSV import, org chart | HR, Admin |
| Documents | Upload, download, categorize HR docs | All |
| Reports | 9-tab analytics with CSV export | HR, Admin |
| Announcements | Priority announcements, expiry dates | All |
| Admin Panel | Departments, workflows, policies, feature flags | HR, Admin |
| First Approver Policy | 5-mode configurable first approver per department | Admin |
| Audit Logs | Full system activity trail | Admin |
| Notifications | In-app bell with unread count | All |
| Email Notifications | SMTP emails for every approval event with deep links | — |
| Background Scheduler | Monthly accrual, carry-forward, birthday leave, reminders | — |
