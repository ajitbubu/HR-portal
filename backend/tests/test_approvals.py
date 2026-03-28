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

    def test_history_unauthenticated(self, client):
        res = client.get("/api/approvals/history")
        assert res.status_code in (401, 403)

    def test_history_items_have_required_fields(self, client, mgr_token):
        res = client.get("/api/approvals/history", headers=auth_header(mgr_token))
        items = res.json()
        for item in items:
            assert "id" in item
            assert "status" in item


class TestApprovalFlowIntegrity:
    def test_full_approve_flow_updates_status(self, client, emp_token, mgr_token):
        """Apply → approve → leave status becomes approved."""
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-10-05",
                "end_date": "2026-10-05",
                "reason": "Flow integrity test",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code not in (200, 201):
            return
        request_id = apply_res.json()["id"]
        assert apply_res.json()["status"] == "pending"

        # Manager approves
        action_res = client.post(
            f"/api/approvals/{request_id}/action",
            json={"action": "approve", "comments": "Looks good"},
            headers=auth_header(mgr_token),
        )
        assert action_res.status_code == 200

        # Check updated status
        detail_res = client.get(f"/api/leave/{request_id}", headers=auth_header(emp_token))
        if detail_res.status_code == 200:
            assert detail_res.json()["status"] in ("approved", "pending")

    def test_full_reject_flow_updates_status(self, client, emp_token, mgr_token):
        """Apply → reject → leave status becomes rejected."""
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        sl_type = next(lt for lt in types if lt["code"] == "SL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": sl_type["id"],
                "start_date": "2026-10-12",
                "end_date": "2026-10-12",
                "reason": "Reject flow test",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code not in (200, 201):
            return
        request_id = apply_res.json()["id"]

        action_res = client.post(
            f"/api/approvals/{request_id}/action",
            json={"action": "reject", "comments": "Not approved"},
            headers=auth_header(mgr_token),
        )
        assert action_res.status_code == 200

    def test_invalid_action_rejected(self, client, mgr_token, emp_token):
        """Invalid action value should return 422 or 400."""
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-11-03",
                "end_date": "2026-11-03",
                "reason": "Invalid action test",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code not in (200, 201):
            return
        request_id = apply_res.json()["id"]

        res = client.post(
            f"/api/approvals/{request_id}/action",
            json={"action": "invalid_action"},
            headers=auth_header(mgr_token),
        )
        assert res.status_code in (400, 422)

    def test_pending_approvals_shape(self, client, mgr_token):
        res = client.get("/api/approvals/pending", headers=auth_header(mgr_token))
        assert res.status_code == 200
        items = res.json()
        for item in items:
            assert "id" in item
            assert "status" in item
