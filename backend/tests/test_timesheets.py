"""E2E tests for Timesheet & Project Tracking."""
from datetime import date
from tests.conftest import auth_header


class TestProjects:
    def test_create_project(self, client, admin_token):
        res = client.post("/api/timesheets/projects", json={
            "name": "Test Project", "code": "TST01", "client": "Test Client",
            "status": "active", "budget_hours": 200, "is_billable": True,
        }, headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["code"] == "TST01"

    def test_list_projects(self, client, admin_token):
        res = client.get("/api/timesheets/projects", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 2  # seed + created

    def test_get_project(self, client, admin_token):
        res = client.get("/api/timesheets/projects/1", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["name"] == "Project Alpha"

    def test_update_project(self, client, admin_token):
        res = client.put("/api/timesheets/projects/1", json={
            "client": "Updated Client",
        }, headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["client"] == "Updated Client"

    def test_employee_cannot_create_project(self, client, emp_token):
        res = client.post("/api/timesheets/projects", json={
            "name": "Forbidden", "code": "NOPE",
        }, headers=auth_header(emp_token))
        assert res.status_code == 403

    def test_add_member(self, client, admin_token):
        # Get employee id (TEST004 = id 4)
        res = client.post("/api/timesheets/projects/2/members", json={
            "employee_id": 4, "role": "member",
        }, headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_list_members(self, client, admin_token):
        res = client.get("/api/timesheets/projects/1/members", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert len(res.json()) >= 2


class TestTimesheetEntries:
    def test_create_entry(self, client, emp_token):
        res = client.post("/api/timesheets/entries", json={
            "project_id": 1, "date": "2026-03-09", "hours": 8.0,
            "description": "Test entry", "is_billable": True,
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["hours"] == 8.0

    def test_update_entry(self, client, emp_token):
        # Create then update
        create = client.post("/api/timesheets/entries", json={
            "project_id": 1, "date": "2026-03-10", "hours": 6.0,
        }, headers=auth_header(emp_token))
        entry_id = create.json()["id"]
        res = client.put(f"/api/timesheets/entries/{entry_id}", json={
            "hours": 7.5,
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["hours"] == 7.5

    def test_delete_entry(self, client, emp_token):
        create = client.post("/api/timesheets/entries", json={
            "project_id": 1, "date": "2026-03-11", "hours": 4.0,
        }, headers=auth_header(emp_token))
        entry_id = create.json()["id"]
        res = client.delete(f"/api/timesheets/entries/{entry_id}", headers=auth_header(emp_token))
        assert res.status_code == 200

    def test_my_entries(self, client, emp_token):
        res = client.get("/api/timesheets/my-entries", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert len(res.json()) >= 5  # seed entries


class TestWeeklyTimesheet:
    def test_submit_weekly(self, client, emp_token):
        res = client.post("/api/timesheets/weekly/submit", json={
            "week_start": "2026-03-02",
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["status"] == "submitted"

    def test_pending_approval(self, client, mgr_token):
        res = client.get("/api/timesheets/weekly/pending-approval", headers=auth_header(mgr_token))
        assert res.status_code == 200

    def test_approve_weekly(self, client, admin_token):
        # Find a submitted timesheet
        pending = client.get("/api/timesheets/weekly/pending-approval", headers=auth_header(admin_token))
        timesheets = pending.json()
        if timesheets:
            ts_id = timesheets[0]["id"]
            res = client.post(f"/api/timesheets/weekly/{ts_id}/action", json={
                "action": "approve", "comments": "Good work",
            }, headers=auth_header(admin_token))
            assert res.status_code == 200
            assert res.json()["status"] == "approved"


class TestReports:
    def test_project_hours(self, client, admin_token):
        res = client.get("/api/timesheets/reports/project-hours/1", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["project_name"] == "Project Alpha"

    def test_utilization(self, client, admin_token):
        res = client.get("/api/timesheets/reports/utilization?start_date=2026-03-01&end_date=2026-03-31",
                         headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_overtime(self, client, admin_token):
        res = client.get("/api/timesheets/reports/overtime?start_date=2026-03-01&end_date=2026-03-31",
                         headers=auth_header(admin_token))
        assert res.status_code == 200
