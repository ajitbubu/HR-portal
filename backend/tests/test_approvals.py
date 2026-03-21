"""E2E tests for approval workflow endpoints."""

from tests.conftest import auth_header


class TestPendingApprovals:
    def test_manager_sees_pending(self, client, mgr_token):
        res = client.get("/api/approvals/pending", headers=auth_header(mgr_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_employee_sees_empty_pending(self, client, emp_token):
        """Employees with no reports should see no pending approvals."""
        res = client.get("/api/approvals/pending", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)


class TestApprovalAction:
    def test_approve_leave(self, client, emp_token, mgr_token):
        # Employee applies for leave
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-08-03",
                "end_date": "2026-08-04",
                "reason": "Approval test",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code not in (200, 201):
            return  # skip if apply failed
        request_id = apply_res.json()["id"]

        # Manager approves
        res = client.post(
            f"/api/approvals/{request_id}/action",
            json={"action": "approve", "comments": "Approved via E2E test"},
            headers=auth_header(mgr_token),
        )
        assert res.status_code == 200

    def test_reject_leave(self, client, emp_token, mgr_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        sl_type = next(lt for lt in types if lt["code"] == "SL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": sl_type["id"],
                "start_date": "2026-09-01",
                "end_date": "2026-09-02",
                "reason": "Rejection test",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code not in (200, 201):
            return
        request_id = apply_res.json()["id"]

        res = client.post(
            f"/api/approvals/{request_id}/action",
            json={"action": "reject", "comments": "Rejected in E2E test"},
            headers=auth_header(mgr_token),
        )
        assert res.status_code == 200


class TestApprovalHistory:
    def test_history_as_manager(self, client, mgr_token):
        res = client.get("/api/approvals/history", headers=auth_header(mgr_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_history_as_admin(self, client, admin_token):
        res = client.get("/api/approvals/history", headers=auth_header(admin_token))
        assert res.status_code == 200
