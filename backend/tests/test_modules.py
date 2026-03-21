"""E2E tests for additional modules: admin, dashboard, org-chart, attendance,
announcements, holidays, salary, reports, onboarding, hr-tickets, performance, audit, documents."""

from tests.conftest import auth_header


def get_employees(client, token):
    """Helper to get employee list items from paginated response."""
    res = client.get("/api/employees", headers=auth_header(token))
    data = res.json()
    return data.get("items", data) if isinstance(data, dict) else data


# ── Admin ──────────────────────────────────────────────

class TestAdminDepartments:
    def test_list_departments(self, client, admin_token):
        res = client.get("/api/admin/departments", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 2

    def test_create_department(self, client, admin_token):
        bus = client.get("/api/admin/business-units", headers=auth_header(admin_token)).json()
        bu_id = bus[0]["id"]
        res = client.post(
            "/api/admin/departments",
            json={"name": "QA", "code": "QA", "business_unit_id": bu_id},
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)

    def test_employee_cannot_create_dept(self, client, emp_token):
        res = client.post(
            "/api/admin/departments",
            json={"name": "Nope", "code": "NO", "business_unit_id": 1},
            headers=auth_header(emp_token),
        )
        assert res.status_code == 403


class TestAdminLocations:
    def test_list_locations(self, client, admin_token):
        res = client.get("/api/admin/locations", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 2

    def test_create_location(self, client, admin_token):
        res = client.post(
            "/api/admin/locations",
            json={"name": "London Office", "city": "London", "country": "UK"},
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)


class TestAdminDesignations:
    def test_list_designations(self, client, admin_token):
        res = client.get("/api/admin/designations", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 4

    def test_create_designation(self, client, admin_token):
        res = client.post(
            "/api/admin/designations",
            json={"title": "QA Lead", "level": 3, "band": "IC3"},
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)


class TestAdminBusinessUnits:
    def test_list_business_units(self, client, admin_token):
        res = client.get("/api/admin/business-units", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1


class TestAdminLeaveTypes:
    def test_list_leave_types(self, client, admin_token):
        res = client.get("/api/admin/leave-types", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 3


class TestAdminSettings:
    def test_list_settings(self, client, admin_token):
        res = client.get("/api/admin/settings", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_update_setting(self, client, admin_token):
        res = client.post(
            "/api/admin/settings",
            json={"key": "company_name", "value": "E2E Test Corp", "category": "general"},
            headers=auth_header(admin_token),
        )
        assert res.status_code == 200


class TestAdminWorkflows:
    def test_list_workflows(self, client, admin_token):
        res = client.get("/api/admin/workflows", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1


# ── Dashboard ──────────────────────────────────────────

class TestDashboard:
    def test_admin_dashboard(self, client, admin_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_employee_dashboard(self, client, emp_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(emp_token))
        assert res.status_code == 200

    def test_no_auth_dashboard(self, client):
        res = client.get("/api/dashboard/stats")
        assert res.status_code in (401, 403)


# ── Org Chart ──────────────────────────────────────────

class TestOrgChart:
    def test_get_org_chart(self, client, admin_token):
        res = client.get("/api/org-chart", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, (list, dict))


# ── Attendance ─────────────────────────────────────────

class TestAttendance:
    def test_check_in(self, client, emp_token):
        res = client.post("/api/attendance/check-in", headers=auth_header(emp_token))
        assert res.status_code in (200, 201, 400)  # 400 if already checked in

    def test_check_out(self, client, emp_token):
        res = client.post("/api/attendance/check-out", headers=auth_header(emp_token))
        assert res.status_code in (200, 400)  # 400 if no check-in

    def test_my_records(self, client, emp_token):
        from datetime import datetime
        now = datetime.now()
        res = client.get(
            f"/api/attendance/my-records?month={now.month}&year={now.year}",
            headers=auth_header(emp_token),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)


# ── Announcements ──────────────────────────────────────

class TestAnnouncements:
    def test_list_announcements(self, client, emp_token):
        res = client.get("/api/announcements", headers=auth_header(emp_token))
        assert res.status_code == 200

    def test_create_announcement(self, client, admin_token):
        res = client.post(
            "/api/announcements",
            json={"title": "E2E Test Announcement", "content": "Testing announcements", "priority": "normal"},
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)

    def test_employee_cannot_create(self, client, emp_token):
        res = client.post(
            "/api/announcements",
            json={"title": "Nope", "content": "Should fail", "priority": "normal"},
            headers=auth_header(emp_token),
        )
        assert res.status_code == 403


# ── Holidays ───────────────────────────────────────────

class TestHolidays:
    def test_list_calendars(self, client, admin_token):
        res = client.get("/api/holidays/calendars", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1

    def test_add_holiday(self, client, admin_token):
        cals = client.get("/api/holidays/calendars", headers=auth_header(admin_token)).json()
        cal_id = cals[0]["id"]
        res = client.post(
            "/api/holidays/",
            json={"calendar_id": cal_id, "name": "E2E Holiday", "date": "2026-07-04"},
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)


# ── Salary ─────────────────────────────────────────────

class TestSalary:
    def test_get_salary_history(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[0]["id"]
        res = client.get(f"/api/salary/history/{emp_id}", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_add_salary_record(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[0]["id"]
        res = client.post(
            "/api/salary",
            json={
                "employee_id": emp_id,
                "effective_date": "2026-04-01",
                "base_pay": 120000,
                "bonus": 10000,
                "allowance": 5000,
                "deduction": 2000,
                "reason": "Annual revision",
            },
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)


# ── Reports ────────────────────────────────────────────

class TestReports:
    def test_export_employees_csv(self, client, admin_token):
        res = client.get("/api/reports/employees/csv", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_export_leave_summary(self, client, admin_token):
        res = client.get("/api/reports/leave-summary/csv", headers=auth_header(admin_token))
        assert res.status_code == 200


# ── Onboarding ─────────────────────────────────────────

class TestOnboarding:
    def test_create_onboarding_task(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.post(
            "/api/onboarding/tasks",
            json={
                "employee_id": emp_id,
                "title": "Setup laptop",
                "description": "Issue company laptop",
                "assigned_to": employees[0]["id"],
                "due_date": "2026-04-01",
            },
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)

    def test_get_onboarding_tasks(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.get(f"/api/onboarding/tasks/{emp_id}", headers=auth_header(admin_token))
        assert res.status_code == 200


# ── HR Tickets ─────────────────────────────────────────

class TestHRTickets:
    def test_create_ticket(self, client, emp_token):
        res = client.post(
            "/api/hr-tickets",
            json={
                "subject": "E2E Test Ticket",
                "description": "Testing ticket creation",
                "priority": "medium",
            },
            headers=auth_header(emp_token),
        )
        assert res.status_code in (200, 201)

    def test_list_tickets(self, client, hr_token):
        res = client.get("/api/hr-tickets", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_update_ticket_status(self, client, hr_token):
        tickets = client.get("/api/hr-tickets", headers=auth_header(hr_token)).json()
        if tickets:
            tid = tickets[0]["id"]
            # status is a query param, not JSON body
            res = client.put(
                f"/api/hr-tickets/{tid}/status?status=in_progress",
                headers=auth_header(hr_token),
            )
            assert res.status_code == 200


# ── Performance ────────────────────────────────────────

class TestPerformance:
    def test_create_review(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        reviewer_id = employees[0]["id"]
        res = client.post(
            "/api/performance",
            json={
                "employee_id": emp_id,
                "reviewer_id": reviewer_id,
                "period": "2025-H2",
                "rating": 4,
                "comments": "E2E test review",
            },
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)

    def test_get_reviews(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.get(f"/api/performance/{emp_id}", headers=auth_header(admin_token))
        assert res.status_code == 200


# ── Audit ──────────────────────────────────────────────

class TestAudit:
    def test_get_audit_logs(self, client, admin_token):
        res = client.get("/api/audit", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_employee_cannot_view_audit(self, client, emp_token):
        res = client.get("/api/audit", headers=auth_header(emp_token))
        assert res.status_code == 403
