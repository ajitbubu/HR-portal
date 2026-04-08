# HR System — Feature Tracker

> Last updated: 2026-04-08
> See `doc/diagrams/architecture.md` for full architecture, flow, and ER diagrams.

---

## PHASE 1 — Foundation (MVP) ✅ COMPLETE

| #  | Feature                                          | Status |
| -- | ------------------------------------------------ | ------ |
| 1  | JWT Authentication + RBAC (5 roles)              | ✅     |
| 2  | Employee directory & CRUD                        | ✅     |
| 3  | Leave apply, balance check, history              | ✅     |
| 4  | Multi-level approval engine                      | ✅     |
| 5  | Leave balance tracking (accrual, carry-forward)  | ✅     |
| 6  | Holiday calendar per country/region              | ✅     |
| 7  | In-app notification center (bell + dropdown)     | ✅     |
| 8  | Role-based route protection                      | ✅     |

---

## PHASE 2 — Enhanced Workflows ✅ COMPLETE

| #  | Feature                                                         | Status |
| -- | --------------------------------------------------------------- | ------ |
| 9  | Cancel pending leave request                                    | ✅     |
| 10 | Email-based approval with deep links                            | ✅     |
| 11 | Escalation reminder notifications                               | ✅     |
| 12 | Team calendar (monthly grid with leave chips)                   | ✅     |
| 13 | Request history with audit timeline                             | ✅     |
| 14 | Comp-Off (apply, 2-level approve, credit, auto-expire 3m)       | ✅     |
| 15 | Half-day leave support (AM/PM, 0.5 days)                        | ✅     |
| 16 | Notification center (bell + unread count)                       | ✅     |

---

## PHASE 3 — WFH & Admin Tools ✅ COMPLETE

| #  | Feature                                                  | Status |
| -- | -------------------------------------------------------- | ------ |
| 17 | WFH request module (quota bars, icon type, approval)     | ✅     |
| 18 | Admin — Employee management (CRUD, bulk CSV import)      | ✅     |
| 19 | Admin — Leave policy management (quota, carry-fwd)       | ✅     |
| 20 | Admin — Holiday calendar management                      | ✅     |
| 21 | Admin — Balance adjustments with audit trail             | ✅     |
| 22 | Role-based route protection (all pages)                  | ✅     |

---

## PHASE 4 — Analytics & Additional Modules ✅ MOSTLY COMPLETE

| #  | Feature                                                  | Status      |
| -- | -------------------------------------------------------- | ----------- |
| 23 | Reports & Analytics (9 tabs, CSV export, Recharts)       | ✅          |
| 24 | Monthly accrual cron job                                 | 🔲 Planned  |
| 25 | Year-end carry-forward automation                        | 🔲 Planned  |
| 26 | Birthday/anniversary auto-leave                          | 🔲 Planned  |
| 27 | Mobile-responsive optimization                           | 🔲 Planned  |
| 28 | Medical certificate upload (sick leave > 2 days)         | ✅          |
| 29 | Inline email approval (signed token deep links)          | ✅          |
| 30 | CSV export / bulk employee import                        | ✅          |

---

## PHASE 5 — Extended HR Modules ✅ COMPLETE

| #  | Feature                                                     | Status |
| -- | ----------------------------------------------------------- | ------ |
| 31 | Resignation workflow (apply, notice preview, blocks leave)  | ✅     |
| 32 | Expense management (claims, items, receipts, approval)      | ✅     |
| 33 | Timesheet & time tracking (project-based, weekly, billable) | ✅     |
| 34 | Recruitment (postings, candidates, interviews, offers)      | ✅     |
| 35 | Training (courses, paths, enrollments, certifications)      | ✅     |
| 36 | Salary history & timeline                                   | ✅     |
| 37 | Attendance tracking (check-in/out, records)                 | ✅     |
| 38 | Document management (upload, download, categorize)          | ✅     |
| 39 | Organization chart (interactive hierarchy tree)             | ✅     |
| 40 | Company announcements (priority levels, expiry)             | ✅     |
| 41 | Audit logging (full system activity)                        | ✅     |
| 42 | Dashboard (role-aware stats, quick actions)                 | ✅     |
| 43 | Delegations (manager sets OOO delegate, auto-routed)        | ✅     |

---

## PHASE 6 — Advanced Configuration ✅ COMPLETE

| #  | Feature                                                        | Status |
| -- | -------------------------------------------------------------- | ------ |
| 44 | First Approver Policy (disabled/fixed/manager/dept-head/choice)| ✅     |
| 45 | Approval workflow builder (dept + type + band matching)        | ✅     |
| 46 | Admin feature flags (enable/disable modules)                   | ✅     |
| 47 | Company banner (info/warning/critical, login page)             | ✅     |
| 48 | Gender-aware leave filtering (no Maternity for male employees) | ✅     |
| 49 | Org Leave Balance with Recharts chart + segment dot bars       | ✅     |

---

## Remaining Backlog

| Feature                                | Priority | Notes                                                 |
| -------------------------------------- | -------- | ----------------------------------------------------- |
| Monthly EL/PTO accrual cron            | P0       | +1/month EL, +1.25/month US PTO, capped at quota     |
| Year-end carry-forward processing      | P0       | Jan 1: carry up to max, forfeit rest, expire Apr 1    |
| Birthday/anniversary complimentary day | P2       | Daily check, auto-created pre-approved request        |
| Mobile-responsive pass                 | P2       | Hamburger nav, card-based tables on mobile            |

---

## Demo Credentials

| Role        | Email                       | Password    |
| ----------- | --------------------------- | ----------- |
| Super Admin | admin@datasafeguard.us      | admin123    |
| HR Admin    | hr@datasafeguard.us         | hr123       |
| Manager     | manager@datasafeguard.us    | manager123  |
| Approver    | approver@datasafeguard.us   | approver123 |
| Employee    | employee@datasafeguard.us   | employee123 |
