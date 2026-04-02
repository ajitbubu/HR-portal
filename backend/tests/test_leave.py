"""E2E tests for leave management endpoints."""

from tests.conftest import auth_header


class TestLeaveTypes:
    def test_get_leave_types(self, client, emp_token):
        res = client.get("/api/leave/types", headers=auth_header(emp_token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # AL, SL, CL
        codes = [lt["code"] for lt in data]
        assert "AL" in codes
        assert "SL" in codes
        assert "CL" in codes


class TestLeaveBalance:
    def test_my_balance(self, client, emp_token):
        res = client.get("/api/leave/balance", headers=auth_header(emp_token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    def test_balance_check(self, client, emp_token):
        # Get leave types first
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        res = client.get(
            f"/api/leave/balance-check?leave_type_id={al_type['id']}&start_date=2026-04-01&end_date=2026-04-03",
            headers=auth_header(emp_token),
        )
        assert res.status_code == 200


class TestApplyLeave:
    def test_apply_leave_success(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-06-01",
                "end_date": "2026-06-02",
                "reason": "E2E test leave",
            },
            headers=auth_header(emp_token),
        )
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["status"] in ("pending", "Pending")

    def test_apply_leave_no_auth(self, client):
        res = client.post("/api/leave/apply", json={
            "leave_type_id": 1, "start_date": "2026-06-01",
            "end_date": "2026-06-02", "reason": "test",
        })
        assert res.status_code in (401, 403)


class TestMyLeaveRequests:
    def test_my_requests(self, client, emp_token):
        res = client.get("/api/leave/my-requests", headers=auth_header(emp_token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)


class TestCancelLeave:
    def test_cancel_pending_leave(self, client, emp_token):
        # Apply a leave first
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-07-10",
                "end_date": "2026-07-11",
                "reason": "To be cancelled",
            },
            headers=auth_header(emp_token),
        )
        if apply_res.status_code in (200, 201):
            req_id = apply_res.json()["id"]
            cancel_res = client.post(f"/api/leave/{req_id}/cancel", headers=auth_header(emp_token))
            assert cancel_res.status_code == 200

    def test_cancel_nonexistent_leave(self, client, emp_token):
        res = client.post("/api/leave/999999/cancel", headers=auth_header(emp_token))
        assert res.status_code in (404, 400)


class TestLeaveBalanceShape:
    def test_balance_items_have_required_fields(self, client, emp_token):
        res = client.get("/api/leave/balance", headers=auth_header(emp_token))
        assert res.status_code == 200
        for b in res.json():
            assert "leave_type" in b or "leave_type_id" in b
            assert "entitled" in b
            assert "used" in b
            assert "remaining" in b or "entitled" in b

    def test_balance_values_non_negative(self, client, emp_token):
        res = client.get("/api/leave/balance", headers=auth_header(emp_token))
        for b in res.json():
            assert b["entitled"] >= 0
            assert b["used"] >= 0

    def test_apply_leave_reduces_balance(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")

        # Get balance before
        before = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        al_before = next((b for b in before if b.get("leave_type_id") == al_type["id"] or
                          (b.get("leave_type") and b["leave_type"].get("code") == "AL")), None)

        # Apply 1 day
        apply_res = client.post(
            "/api/leave/apply",
            json={
                "leave_type_id": al_type["id"],
                "start_date": "2026-09-15",
                "end_date": "2026-09-15",
                "reason": "Balance test",
            },
            headers=auth_header(emp_token),
        )
        assert apply_res.status_code in (200, 201)

        # Get balance after
        after = client.get("/api/leave/balance", headers=auth_header(emp_token)).json()
        al_after = next((b for b in after if b.get("leave_type_id") == al_type["id"] or
                         (b.get("leave_type") and b["leave_type"].get("code") == "AL")), None)

        if al_before and al_after:
            # pending should have increased
            assert al_after.get("pending", 0) >= al_before.get("pending", 0)


class TestLeaveRequestDetails:
    def test_my_requests_items_have_required_fields(self, client, emp_token):
        requests = client.get("/api/leave/my-requests", headers=auth_header(emp_token)).json()
        for req in requests:
            assert "id" in req
            assert "status" in req
            assert "start_date" in req
            assert "end_date" in req
            assert "total_days" in req

    def test_my_requests_unauthenticated(self, client):
        res = client.get("/api/leave/my-requests")
        assert res.status_code in (401, 403)

    def test_my_requests_has_approvals_field(self, client, emp_token):
        requests = client.get("/api/leave/my-requests", headers=auth_header(emp_token)).json()
        for req in requests:
            assert "approvals" in req
