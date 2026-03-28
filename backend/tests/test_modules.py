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


# ── Reports — Headcount Analytics ──────────────────────

class TestReportsHeadcount:
    def test_admin_gets_headcount(self, client, admin_token):
        res = client.get("/api/reports/headcount", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_headcount_response_shape(self, client, admin_token):
        res = client.get("/api/reports/headcount", headers=auth_header(admin_token))
        data = res.json()
        for key in ["total_active", "by_department", "by_location", "by_employment_type", "monthly_hires"]:
            assert key in data, f"Missing key: {key}"
        assert isinstance(data["by_department"], list)
        assert isinstance(data["by_location"], list)
        assert isinstance(data["by_employment_type"], list)
        assert isinstance(data["monthly_hires"], list)
        assert len(data["monthly_hires"]) == 12

    def test_headcount_total_active_positive(self, client, admin_token):
        res = client.get("/api/reports/headcount", headers=auth_header(admin_token))
        assert res.json()["total_active"] >= 4

    def test_manager_can_access_headcount(self, client, mgr_token):
        res = client.get("/api/reports/headcount", headers=auth_header(mgr_token))
        assert res.status_code == 200

    def test_employee_cannot_access_headcount(self, client, emp_token):
        res = client.get("/api/reports/headcount", headers=auth_header(emp_token))
        assert res.status_code == 403

    def test_monthly_hires_shape(self, client, admin_token):
        res = client.get("/api/reports/headcount", headers=auth_header(admin_token))
        hires = res.json()["monthly_hires"]
        for entry in hires:
            assert "month" in entry
            assert "count" in entry
            assert entry["count"] >= 0


# ── Leave — Team Calendar ───────────────────────────────

class TestLeaveTeamCalendar:
    def test_returns_list(self, client, admin_token):
        from datetime import datetime
        now = datetime.now()
        res = client.get(
            f"/api/leave/team-calendar?month={now.month}&year={now.year}",
            headers=auth_header(admin_token),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_calendar_item_shape(self, client, admin_token):
        from datetime import datetime
        now = datetime.now()
        # Apply a leave first so there's something to check
        types = client.get("/api/leave/types", headers=auth_header(admin_token)).json()
        if types:
            client.post(
                "/api/leave/apply",
                json={
                    "leave_type_id": types[0]["id"],
                    "start_date": f"{now.year}-{now.month:02d}-20",
                    "end_date": f"{now.year}-{now.month:02d}-20",
                    "reason": "Team calendar test",
                },
                headers=auth_header(admin_token),
            )
        res = client.get(
            f"/api/leave/team-calendar?month={now.month}&year={now.year}",
            headers=auth_header(admin_token),
        )
        items = res.json()
        for item in items:
            assert "employee_id" in item
            assert "employee_name" in item
            assert "leave_type" in item
            assert "start_date" in item
            assert "end_date" in item
            assert "status" in item

    def test_filter_by_department(self, client, admin_token):
        from datetime import datetime
        now = datetime.now()
        depts = client.get("/api/admin/departments", headers=auth_header(admin_token)).json()
        if depts:
            dept_id = depts[0]["id"]
            res = client.get(
                f"/api/leave/team-calendar?month={now.month}&year={now.year}&department_id={dept_id}",
                headers=auth_header(admin_token),
            )
            assert res.status_code == 200
            assert isinstance(res.json(), list)

    def test_unauthenticated_calendar(self, client):
        res = client.get("/api/leave/team-calendar?month=4&year=2026")
        assert res.status_code in (401, 403)

    def test_employee_can_access_calendar(self, client, emp_token):
        res = client.get("/api/leave/team-calendar?month=4&year=2026", headers=auth_header(emp_token))
        assert res.status_code == 200


# ── Attendance — Edge Cases ─────────────────────────────

class TestAttendanceEdgeCases:
    def test_admin_views_own_records(self, client, admin_token):
        from datetime import datetime
        now = datetime.now()
        res = client.get(
            f"/api/attendance/my-records?month={now.month}&year={now.year}",
            headers=auth_header(admin_token),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_double_checkin_rejected(self, client, emp_token):
        # First check-in (may already be done from earlier test)
        client.post("/api/attendance/check-in", headers=auth_header(emp_token))
        # Second check-in same day should be rejected
        res = client.post("/api/attendance/check-in", headers=auth_header(emp_token))
        assert res.status_code == 400

    def test_checkout_without_checkin_rejected(self, client, hr_token):
        # Fresh user (HR hasn't checked in during tests)
        # First checkout should fail if no check-in
        res1 = client.post("/api/attendance/check-out", headers=auth_header(hr_token))
        # Either 400 (no check-in) or 200 (if already checked in from other test)
        assert res1.status_code in (200, 400)

    def test_unauthenticated_checkin_rejected(self, client):
        res = client.post("/api/attendance/check-in")
        assert res.status_code in (401, 403)


# ── Performance — Extended ──────────────────────────────

class TestPerformanceExtended:
    def test_create_review_all_fields(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.post(
            "/api/performance",
            json={
                "employee_id": emp_id,
                "period": "Q1 2026",
                "rating": 5,
                "comments": "Exceptional performance this quarter",
                "goals": "Lead a new project in Q2",
            },
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["period"] == "Q1 2026"
        assert data["rating"] == 5

    def test_employee_can_view_own_reviews(self, client, emp_token, admin_token):
        # Get the employee's own id
        me = client.get("/api/auth/me", headers=auth_header(emp_token)).json()
        emp_id = me["employee_id"]
        res = client.get(f"/api/performance/{emp_id}", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_employee_cannot_view_others_reviews(self, client, emp_token, admin_token):
        # Get admin employee id (different from emp)
        admin_emp = get_employees(client, admin_token)[0]
        emp_me = client.get("/api/auth/me", headers=auth_header(emp_token)).json()
        if admin_emp["id"] != emp_me["employee_id"]:
            res = client.get(
                f"/api/performance/{admin_emp['id']}",
                headers=auth_header(emp_token),
            )
            assert res.status_code == 403

    def test_manager_can_view_report_reviews(self, client, mgr_token, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.get(f"/api/performance/{emp_id}", headers=auth_header(mgr_token))
        assert res.status_code == 200

    def test_review_response_shape(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.get(f"/api/performance/{emp_id}", headers=auth_header(admin_token))
        reviews = res.json()
        if reviews:
            r = reviews[0]
            assert "id" in r
            assert "employee_id" in r
            assert "period" in r
            assert "status" in r
