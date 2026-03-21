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
