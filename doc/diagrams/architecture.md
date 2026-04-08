# DataSafeguard HR Platform — Architecture Diagrams

> Last updated: 2026-04-08  
> Stack: Next.js 14 · FastAPI · PostgreSQL 16 · Docker Compose

---

## 1. System Architecture

```mermaid
graph TB
    subgraph Client["Browser / Client"]
        USER["👤 User\n(Employee / Manager / Admin)"]
    end

    subgraph Docker["Docker Compose Stack  (:3000 / :8000 / :5432)"]
        direction TB

        subgraph FrontendLayer["Frontend — Node 20 Standalone"]
            NEXT["Next.js 14\nApp Router + TypeScript\nTailwind CSS + Recharts"]
        end

        subgraph BackendLayer["Backend — Python 3.12"]
            FAST["FastAPI\nUvicorn ASGI"]
            RBAC["RBAC Middleware\n(5 roles)"]
            SVC["Services Layer\napproval · leave · audit\nnotification · email"]
            ORM["SQLAlchemy ORM\nPydantic v2 schemas"]
        end

        subgraph DataLayer["Data"]
            DB[("PostgreSQL 16\n49 tables")]
            UPLOADS["File Storage\n/uploads\n(certs · photos · docs)"]
        end
    end

    subgraph External["External"]
        SMTP["SMTP Server\nApproval emails\nDeep-link actions"]
    end

    USER -->|"HTTPS :3000"| NEXT
    NEXT -->|"REST /api/* JWT Bearer"| FAST
    FAST --> RBAC --> SVC --> ORM
    ORM -->|"SQL"| DB
    SVC -->|"File I/O"| UPLOADS
    SVC -->|"SMTP"| SMTP

    style Docker fill:#f8fafc,stroke:#e2e8f0
    style FrontendLayer fill:#eff6ff,stroke:#bfdbfe
    style BackendLayer fill:#f0fdf4,stroke:#bbf7d0
    style DataLayer fill:#fef9c3,stroke:#fde68a
    style External fill:#fdf4ff,stroke:#e9d5ff
```

---

## 2. Frontend Module Map

```mermaid
graph LR
    APP["Next.js App Router\n/src/app"]

    APP --> AUTH["🔐 /login\nJWT auth\n5 roles"]

    APP --> DASH["📊 /dashboard\nRole-aware stat cards\nPending approvals\nAnnouncements"]

    APP --> LEAVE["📅 Leave\n/leave"]
    LEAVE --> LA["/leave/apply\nPolicy-aware\nfirst approver\nBalance check\nMed cert upload"]
    LEAVE --> LH["/leave (history)\nTimeline · Cancel"]
    LEAVE --> LC["/leave/calendar\nTeam monthly grid"]
    LEAVE --> LO["/leave/org-balance\nRecharts utilisation\nSegment dot bars"]
    LEAVE --> CO["/leave/comp-off\nApply → 2-level approve\nAuto-expire 3m"]

    APP --> WFH["🏠 WFH\n/wfh · /wfh/apply\n/wfh/approvals\nQuota bars · icon type"]

    APP --> APPR["✅ /approvals\nPending · History\nApprove/Reject\nSend-back · Delegate\nEmail deep-link banner"]

    APP --> EMP["👥 Employees\n/employees (directory)\n/employees/new\n/employees/import (CSV)"]

    APP --> ADMIN["⚙️ Admin Panel\n/admin"]
    ADMIN --> ADept["/admin/departments"]
    ADMIN --> ATeam["/admin/teams"]
    ADMIN --> ALPol["/admin/leave-policies"]
    ADMIN --> AHol["/admin/holidays\nCalendars + holidays"]
    ADMIN --> ABalAdj["/admin/balance-adjustments"]
    ADMIN --> AWf["/admin/workflows\nMulti-step config"]
    ADMIN --> AFA["/admin/first-approver-config\nDisabled · Fixed · Manager\nDept Head · Employee choice"]
    ADMIN --> AEmp["/admin/employees\nActivate · Deactivate"]
    ADMIN --> ACfg["/admin/config\nFeature flags"]
    ADMIN --> ASet["/admin/settings\nBanner · company config"]
    ADMIN --> AAudit["/admin/audit\nFull audit log"]

    APP --> REPORTS["📈 /reports\n9 tabs · CSV export\nRecharts charts"]
    APP --> RSGN["📝 /resignation/apply\nNotice period preview"]
    APP --> EXP["💰 /expenses\nClaims · Items\n/expenses/new"]
    APP --> TS["⏱ /timesheets\nProject hours\nWeekly entry"]
    APP --> PROF["👤 /profile\nPhoto · Delegation\nBalance dots"]
    APP --> OC["🌳 /org-chart\nInteractive tree"]
    APP --> SALARY["💳 /salary\nHistory timeline"]
    APP --> ATT["📍 /attendance\nCheck-in/out · Records"]
    APP --> ANN["📢 /announcements"]
    APP --> DOCS["📁 /documents\nUpload · Download"]
    APP --> RECRUIT["🎯 /recruitment\nPostings · Candidates\nInterviews · Offers"]
    APP --> TRAIN["🎓 /training\nCourses · Paths\nEnrollments · Certs"]
    APP --> NOTIF["🔔 Notification Bell\nUnread badge\nDropdown panel"]

    style APP fill:#3b82f6,color:#fff,stroke:#2563eb
    style ADMIN fill:#8b5cf6,color:#fff,stroke:#7c3aed
    style LEAVE fill:#10b981,color:#fff,stroke:#059669
```

---

## 3. Backend API Map

```mermaid
graph LR
    API["FastAPI\n/api"]

    API --> AAUTH["Auth\nPOST /auth/login\nGET  /auth/me\nPOST /auth/register"]

    API --> AEMP["Employees\nGET  /employees\nPOST /employees\nPUT  /employees/{id}\nDELETE /employees/{id}\nPOST /employees/bulk-import"]

    API --> ALEAVE["Leave\nGET  /leave/types  (gender-filtered)\nPOST /leave/apply\nGET  /leave/balance\nGET  /leave/balance-check\nGET  /leave/my-requests\nPOST /leave/{id}/cancel\nGET  /leave/org-balance\nGET  /leave/calendar\nGET  /leave/first-approver-config\nGET  /leave/eligible-first-approvers\nPOST /leave/upload-attachment\nGET  /leave/comp-off/my-requests\nPOST /leave/comp-off"]

    API --> AAPPR["Approvals\nGET  /approvals/pending\nPOST /approvals/{id}/action\nGET  /approvals/history\nGET  /approvals/approve-via-email"]

    API --> AWFH["WFH\nGET  /wfh\nPOST /wfh\nGET  /wfh/approvals\nPOST /wfh/{id}/action"]

    API --> AADMIN["Admin\nCRUD /admin/departments\nCRUD /admin/teams\nCRUD /admin/leave-types\nCRUD /admin/leave-policies\nCRUD /admin/workflows\nCRUD /admin/first-approver-policies\nCRUD /admin/holidays · /calendars\nPOST /admin/balance-adjustments\nGET  /admin/features\nGET/PUT /admin/settings\nGET  /admin/banner"]

    API --> AREP["Reports\nGET /reports/employees/csv\nGET /reports/leave-summary/csv\nGET /reports/attendance/csv\nGET /reports/leave-utilization\nGET /reports/headcount\nGET /reports/pending-approval-aging\nGET /reports/absenteeism-trends\nGET /reports/comp-off-status"]

    API --> AMISC["Other Modules\nGET/POST /salary\nGET/POST /attendance\nGET/POST /documents\nGET/POST /notifications\nGET/POST /announcements\nGET/POST /expenses\nGET/POST /timesheets\nGET/POST /recruitment\nGET/POST /training\nGET/POST /resignation\nGET/POST /delegations\nGET      /org-chart\nGET      /dashboard/stats\nGET      /audit"]

    style API fill:#f59e0b,color:#fff,stroke:#d97706
    style AADMIN fill:#8b5cf6,color:#fff,stroke:#7c3aed
    style ALEAVE fill:#10b981,color:#fff,stroke:#059669
    style AREP fill:#3b82f6,color:#fff,stroke:#2563eb
```

---

## 4. Database Schema (Key Relationships)

```mermaid
erDiagram
    USERS {
        int id PK
        string email
        string role
        bool is_active
    }
    EMPLOYEES {
        int id PK
        int user_id FK
        int department_id FK
        int manager_id FK
        int designation_id FK
        string gender
        date joining_date
        string band
        string status
    }
    DEPARTMENTS {
        int id PK
        int head_id FK
        string name
        string code
    }
    LEAVE_TYPES {
        int id PK
        string name
        string code
        float default_days
        bool is_paid
        bool carry_forward
        int min_days_notice
    }
    LEAVE_REQUESTS {
        int id PK
        int employee_id FK
        int leave_type_id FK
        date start_date
        date end_date
        float total_days
        bool is_half_day
        string status
        int current_approval_step
    }
    LEAVE_APPROVALS {
        int id PK
        int leave_request_id FK
        int approver_id FK
        int step_order
        string status
        datetime acted_at
    }
    LEAVE_BALANCES {
        int id PK
        int employee_id FK
        int leave_type_id FK
        int year
        float entitled
        float used
        float pending
        float remaining
    }
    APPROVAL_WORKFLOWS {
        int id PK
        int department_id FK
        int leave_type_id FK
        string band
        bool is_default
    }
    APPROVAL_WORKFLOW_STEPS {
        int id PK
        int workflow_id FK
        int step_order
        string approver_role
        int specific_approver_id FK
    }
    FIRST_APPROVER_POLICIES {
        int id PK
        string mode
        int fixed_approver_id FK
        int department_id FK
        bool is_active
    }
    DELEGATION_SETTINGS {
        int id PK
        int delegator_id FK
        int delegate_id FK
        date start_date
        date end_date
    }
    COMP_OFF_GRANTS {
        int id PK
        int employee_id FK
        date work_date
        float days_granted
        string status
        date expires_at
    }
    WFH_REQUESTS {
        int id PK
        int employee_id FK
        date request_date
        string wfh_type
        string status
    }
    HOLIDAY_CALENDARS {
        int id PK
        string name
        int year
    }
    HOLIDAYS {
        int id PK
        int calendar_id FK
        string name
        date date
        bool is_optional
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string title
        string type
        bool is_read
    }

    USERS ||--o| EMPLOYEES : "has profile"
    EMPLOYEES }o--|| DEPARTMENTS : "belongs to"
    EMPLOYEES }o--o| EMPLOYEES : "manager_id"
    LEAVE_REQUESTS }o--|| EMPLOYEES : "submitted by"
    LEAVE_REQUESTS }o--|| LEAVE_TYPES : "of type"
    LEAVE_REQUESTS ||--|{ LEAVE_APPROVALS : "has steps"
    LEAVE_APPROVALS }o--|| EMPLOYEES : "assigned to"
    LEAVE_BALANCES }o--|| EMPLOYEES : "for employee"
    LEAVE_BALANCES }o--|| LEAVE_TYPES : "of type"
    APPROVAL_WORKFLOWS ||--|{ APPROVAL_WORKFLOW_STEPS : "defines"
    FIRST_APPROVER_POLICIES }o--o| DEPARTMENTS : "scoped to"
    FIRST_APPROVER_POLICIES }o--o| EMPLOYEES : "fixed approver"
    DELEGATION_SETTINGS }o--|| EMPLOYEES : "delegator"
    DELEGATION_SETTINGS }o--|| EMPLOYEES : "delegate"
    COMP_OFF_GRANTS }o--|| EMPLOYEES : "earned by"
    WFH_REQUESTS }o--|| EMPLOYEES : "requested by"
    HOLIDAY_CALENDARS ||--|{ HOLIDAYS : "contains"
    NOTIFICATIONS }o--|| USERS : "sent to"
```

---

## 5. Leave Application & Approval Flow

```mermaid
sequenceDiagram
    actor Emp as Employee
    participant UI as Next.js UI
    participant API as FastAPI
    participant PS as Policy Service
    participant AS as Approval Service
    participant DB as PostgreSQL
    participant SMTP as Email / SMTP

    Emp->>UI: Open /leave/apply
    UI->>API: GET /leave/first-approver-config
    API->>PS: resolve_first_approver_from_policy(emp)
    PS-->>API: {mode, fixed_approver, eligible_list}
    API-->>UI: FirstApproverConfigResponse
    Note over UI: Renders widget based on mode:<br/>disabled | fixed | manager |<br/>dept_head | employee_choice

    Emp->>UI: Fill form + submit
    UI->>API: POST /leave/apply
    API->>API: Validate (balance, notice, cert, gender, overlap)
    API->>DB: INSERT leave_requests (PENDING)
    API->>PS: resolve_first_approver_from_policy(emp, submitted_id)
    PS-->>API: effective_first_approver_id
    API->>AS: create_approval_chain(request, emp, first_approver_id)

    AS->>DB: Resolve workflow (dept+type+band → dept+type → dept → default)
    alt first_approver_id provided
        AS->>DB: INSERT leave_approvals step=0 (first approver)
    end
    loop For each workflow step
        AS->>DB: INSERT leave_approvals step=N
    end
    AS->>SMTP: Notify step-1 approver

    API-->>UI: 201 LeaveRequestResponse
    UI-->>Emp: Redirect → /leave (history)

    Note over SMTP,Emp: Approval Chain Execution

    SMTP->>Approver: Email with Approve / Reject deep links
    Approver->>API: GET /approvals/approve-via-email?action=approve&token=…
    API->>API: Validate signed token
    API->>AS: process_approval_action(approve)
    AS->>DB: UPDATE leave_approvals step=N APPROVED

    alt More steps remain
        AS->>DB: UPDATE leave_requests current_step++
        AS->>SMTP: Notify next approver
    else Final step approved
        AS->>DB: UPDATE leave_requests status=APPROVED
        AS->>DB: UPDATE leave_balances (used++, pending--)
        AS->>SMTP: Notify employee (APPROVED)
    end
```

---

## 6. First Approver Policy Resolution

```mermaid
flowchart TD
    START([Employee submits\nleave request]) --> LOOKUP{Policy lookup}

    LOOKUP --> DEPTPOL{Department-specific\npolicy exists?}
    DEPTPOL -->|Yes| APPLY[Use department policy]
    DEPTPOL -->|No| GLOBPOL{Global policy\nexists?}
    GLOBPOL -->|Yes| APPLY
    GLOBPOL -->|No| DEFAULT[Default:\nemployee_choice]

    APPLY --> MODE{mode?}
    DEFAULT --> DROPDOWN[Show approver dropdown\n— employee picks]

    MODE -->|disabled| SKIP[No first approver\nskip to workflow]
    MODE -->|employee_choice| DROPDOWN
    MODE -->|fixed| FIXED[Use policy.fixed_approver_id\nShow name info strip]
    MODE -->|manager| MGR[Use employee.manager_id\nShow 'Reporting Manager' strip]
    MODE -->|department_head| DHEAD[Resolve dept.head_id\nShow 'Department Head' strip]

    SKIP --> CHAIN[Build approval chain]
    DROPDOWN --> CHAIN
    FIXED --> CHAIN
    MGR --> CHAIN
    DHEAD --> CHAIN

    CHAIN --> WFRES{Workflow resolution}
    WFRES --> W1[dept + leave_type + band]
    WFRES --> W2[dept + leave_type]
    WFRES --> W3[dept only]
    WFRES --> W4[default workflow]
    W1 & W2 & W3 & W4 --> INSERT([INSERT leave_approvals\nstep 0..N])
```

---

## 7. Role-Based Access Map

```mermaid
graph TD
    subgraph Roles
        SA["🔑 super_admin"]
        HR["👩‍💼 hr_admin"]
        MGR["👔 manager"]
        APR["✅ approver"]
        EMP["👤 employee"]
    end

    subgraph Pages
        ADMIN_PANEL["Admin Panel\n/admin/*"]
        REPORTS_PAGE["Reports\n/reports"]
        APPROVALS_PAGE["Approvals\n/approvals"]
        LEAVE_PAGES["Leave Apply/History\n/leave/*"]
        WFH_PAGES["WFH\n/wfh/*"]
        COMP_OFF["Comp-Off\n/leave/comp-off"]
        SALARY_PAGE["Salary\n/salary"]
        ORG_BALANCE["Org Balance\n/leave/org-balance"]
    end

    SA -->|Full access| ADMIN_PANEL
    HR -->|Full access| ADMIN_PANEL
    SA & HR -->|Full access| REPORTS_PAGE
    SA & HR & MGR & APR -->|Pending/History| APPROVALS_PAGE
    SA & HR & MGR & APR & EMP -->|Own requests| LEAVE_PAGES
    SA & HR & MGR & APR & EMP -->|Own requests| WFH_PAGES
    SA & HR & MGR & APR & EMP -->|Own requests| COMP_OFF
    MGR & SA & HR -->|Team view| ORG_BALANCE
    SA & HR -->|All employees| SALARY_PAGE
    EMP -->|Own salary| SALARY_PAGE

    style SA fill:#7c3aed,color:#fff
    style HR fill:#0891b2,color:#fff
    style MGR fill:#059669,color:#fff
    style APR fill:#d97706,color:#fff
    style EMP fill:#64748b,color:#fff
```

---

## 8. Feature Implementation Status

```mermaid
pie title Features by Status
    "Fully Implemented" : 34
    "Placeholder / Partial" : 5
    "Planned (not started)" : 4
```

### Implemented Modules

| Module | Key Capabilities |
|--------|-----------------|
| **Authentication** | JWT login/logout, bcrypt, RBAC (5 roles), route protection |
| **Leave Management** | Apply, balance check, half-day, cancel, history, timeline, gender filter (no ML for males) |
| **Leave Approval Engine** | Multi-step configurable workflow, approve/reject/send-back/delegate, email deep-links |
| **First Approver Policy** | 5 modes: disabled / employee_choice / fixed / manager / department_head; dept-scope + global |
| **Comp-Off** | Apply → 2-level approval → balance credited → auto-expire 3 months |
| **WFH Requests** | Quota bars, icon-based type selector, manager approval |
| **Delegation Settings** | Manager sets OOO delegate with date range; auto-routed in approval chain |
| **Holiday Calendar** | Per-calendar, national/regional/optional, excluded from day calculations |
| **Leave Policies** | Quota, carry-forward, required docs, min notice, paid/unpaid |
| **Balance Adjustments** | Admin manual override with reason + audit trail |
| **Approval Workflows** | Dept+type+band matching, department head / manager / specific / hr_admin roles |
| **Employee Management** | CRUD, bulk CSV import, deactivate, pro-rated balance init |
| **Org Leave Balance** | Team view with Recharts utilisation chart, segment dot bars, expand-per-employee |
| **Team Calendar** | Monthly grid with leave chips per day |
| **Resignation** | Apply, notice period preview, blocks leave during notice |
| **Expenses** | Claims, items, receipt upload, approval |
| **Timesheets** | Project-based weekly time entry, billable tracking |
| **Recruitment** | Job postings, candidates, interviews, offer letters |
| **Training** | Courses, learning paths, enrollments, certifications |
| **Salary** | History timeline, salary records |
| **Attendance** | Check-in/out, records, summary |
| **Documents** | Upload, download, categorize |
| **Notifications** | In-app bell, unread badge, mark read |
| **Announcements** | Company-wide, priority levels, expiry |
| **Org Chart** | Interactive employee hierarchy tree |
| **Reports** | 9 tabs with Recharts charts + CSV export |
| **Audit Log** | Full system activity log |
| **Dashboard** | Role-aware stat cards, quick actions |
| **Admin Panel** | Departments, teams, policies, workflows, holidays, settings, feature flags, banner |

### Planned / Not Started

| Feature | Notes |
|---------|-------|
| Monthly accrual cron job | EL +1/month, US PTO +1.25/month |
| Year-end carry-forward automation | January 1st processing |
| Birthday/anniversary auto-leave | Daily check, auto-approve |
| Mobile-responsive optimization | Hamburger sidebar, card tables |
