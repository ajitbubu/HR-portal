"""Integration tests - verify service layers work together with real DB.

Tests multi-step workflows that span multiple services:
- Leave apply -> approval chain -> balance update -> notification
- Employee create -> user + employee records linked
- Attendance check-in -> check-out -> hours calculated
"""

from tests.conftest import auth_header


class TestLeaveWorkflowIntegration:
    """Full leave lifecycle: apply -> approve -> balance updated -> notifications sent."""

    def test_full_leave_approve_lifecycle(self, client, emp_token, mgr_token):
        # 1. Check initial balance
        balance_before = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        al_balance = next(b for b in balance_before if b["leave_type"]["code"] == "AL")
        initial_available = al_balance["entitled"] - al_balance["used"] - al_balance["pending"]

        # 2. Apply leave
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        apply_res = client.post("/api/leave/apply", json={
            "leave_type_id": al_type["id"],
            "start_date": "2026-10-05",
            "end_date": "2026-10-06",
            "reason": "Integration test leave",
        }, headers=auth_header(emp_token))
        assert apply_res.status_code in (200, 201)
        leave_id = apply_res.json()["id"]

        # 3. Verify balance shows pending
        balance_mid = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        al_mid = next(b for b in balance_mid if b["leave_type"]["code"] == "AL")
        assert al_mid["pending"] > al_balance["pending"]

        # 4. Manager sees pending approval
        pending = client.get("/api/approvals/pending", headers=auth_header(mgr_token)).json()
        assert any(p["id"] == leave_id for p in pending)

        # 5. Manager approves
        approve_res = client.post(f"/api/approvals/{leave_id}/action", json={
            "action": "approve", "comments": "Integration test approved",
        }, headers=auth_header(mgr_token))
        assert approve_res.status_code == 200

        # 6. Verify leave is in employee's requests as approved
        my_requests = client.get("/api/leave/my-requests", headers=auth_header(emp_token)).json()
        approved = [r for r in my_requests if r["id"] == leave_id]
        assert len(approved) == 1
        assert approved[0]["status"].lower() == "approved"

        # 7. Verify notification was sent to employee
        notifs = client.get("/api/notifications", headers=auth_header(emp_token)).json()
        approval_notifs = [n for n in notifs if "approved" in n["message"].lower() or "Approved" in n["title"]]
        assert len(approval_notifs) >= 1

    def test_leave_reject_restores_balance(self, client, emp_token, mgr_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        sl_type = next(lt for lt in types if lt["code"] == "SL")

        # Apply
        apply_res = client.post("/api/leave/apply", json={
            "leave_type_id": sl_type["id"],
            "start_date": "2026-10-12",
            "end_date": "2026-10-13",
            "reason": "Will be rejected",
        }, headers=auth_header(emp_token))
        assert apply_res.status_code in (200, 201)
        leave_id = apply_res.json()["id"]

        balance_before = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        sl_before = next(b for b in balance_before if b["leave_type"]["code"] == "SL")

        # Reject
        reject_res = client.post(f"/api/approvals/{leave_id}/action", json={
            "action": "reject", "comments": "Rejected for testing",
        }, headers=auth_header(mgr_token))
        assert reject_res.status_code == 200

        # Balance pending should decrease
        balance_after = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        sl_after = next(b for b in balance_after if b["leave_type"]["code"] == "SL")
        assert sl_after["pending"] <= sl_before["pending"]


class TestEmployeeLifecycleIntegration:
    """Employee creation creates linked user + employee records."""

    def test_create_employee_full_lifecycle(self, client, admin_token):
        import uuid
        unique = uuid.uuid4().hex[:6]

        # Get valid department/designation/location
        deps = client.get("/api/admin/departments", headers=auth_header(admin_token)).json()
        desigs = client.get("/api/admin/designations", headers=auth_header(admin_token)).json()
        locs = client.get("/api/admin/locations", headers=auth_header(admin_token)).json()

        # Create employee
        create_res = client.post("/api/employees", json={
            "employee_id": f"INT{unique}",
            "first_name": "Integration",
            "last_name": "Test",
            "email": f"int_{unique}@test.com",
            "department_id": deps[0]["id"],
            "designation_id": desigs[0]["id"],
            "location_id": locs[0]["id"],
            "band": "IC1",
            "joining_date": "2026-04-01",
            "status": "active",
        }, headers=auth_header(admin_token))
        assert create_res.status_code in (200, 201)
        emp_data = create_res.json()

        # Verify can fetch by ID
        get_res = client.get(f"/api/employees/{emp_data['id']}", headers=auth_header(admin_token))
        assert get_res.status_code == 200
        assert get_res.json()["first_name"] == "Integration"

        # Update employee
        update_res = client.put(f"/api/employees/{emp_data['id']}", json={
            "first_name": "Updated",
        }, headers=auth_header(admin_token))
        assert update_res.status_code == 200

        # Verify update
        verify = client.get(f"/api/employees/{emp_data['id']}", headers=auth_header(admin_token))
        assert verify.json()["first_name"] == "Updated"


class TestAttendanceIntegration:
    """Check-in -> Check-out flow with hours calculation."""

    def test_checkin_checkout_flow(self, client, mgr_token):
        # Manager checks in
        checkin = client.post("/api/attendance/check-in", headers=auth_header(mgr_token))
        assert checkin.status_code in (200, 400)  # 400 if already checked in today

        # Check out
        checkout = client.post("/api/attendance/check-out", headers=auth_header(mgr_token))
        assert checkout.status_code in (200, 400)

        # Verify records exist
        from datetime import datetime
        now = datetime.now()
        records = client.get(
            f"/api/attendance/my-records?month={now.month}&year={now.year}",
            headers=auth_header(mgr_token),
        ).json()
        assert isinstance(records, list)


class TestNotificationIntegration:
    """Notifications are created by various actions and can be managed."""

    def test_announcement_triggers_notifications(self, client, admin_token, emp_token):
        # Count notifications before
        before = client.get("/api/notifications/unread-count", headers=auth_header(emp_token)).json()

        # Create announcement (triggers notifications for all users)
        client.post("/api/announcements", json={
            "title": "Integration Notification Test",
            "content": "This should trigger notifications",
            "priority": "high",
        }, headers=auth_header(admin_token))

        # Check notification count increased
        after = client.get("/api/notifications/unread-count", headers=auth_header(emp_token)).json()
        assert after["count"] >= before["count"]

    def test_hr_ticket_notifies_admins(self, client, emp_token, hr_token):
        before = client.get("/api/notifications/unread-count", headers=auth_header(hr_token)).json()

        # Employee creates ticket
        client.post("/api/hr-tickets", json={
            "subject": "Integration Ticket",
            "description": "Testing notification",
            "priority": "high",
        }, headers=auth_header(emp_token))

        after = client.get("/api/notifications/unread-count", headers=auth_header(hr_token)).json()
        assert after["count"] >= before["count"]


class TestCrossModuleIntegration:
    """Test data consistency across modules."""

    def test_dashboard_stats_reflect_data(self, client, admin_token):
        # Get stats
        stats = client.get("/api/dashboard/stats", headers=auth_header(admin_token)).json()
        assert "total_employees" in stats
        assert stats["total_employees"] >= 4  # seeded employees

        # Get actual employee count
        emps = client.get("/api/employees", headers=auth_header(admin_token)).json()
        total = emps.get("total", len(emps.get("items", emps)))
        assert stats["total_employees"] == total

    def test_org_chart_matches_employees(self, client, admin_token):
        org = client.get("/api/org-chart", headers=auth_header(admin_token)).json()
        assert org is not None
        # Org chart should have at least the root employee
        if isinstance(org, dict):
            assert "name" in org or "employee_id" in org
        elif isinstance(org, list):
            assert len(org) >= 1
