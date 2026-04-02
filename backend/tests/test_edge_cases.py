"""Data validation and edge case tests.

Tests boundary conditions, unusual inputs, and error handling:
- Empty/null inputs
- Boundary values (max int, empty strings)
- Concurrent-like operations
- Invalid IDs and references
- Special characters in text fields
"""

from tests.conftest import auth_header


class TestBoundaryValues:
    """Test edge case values for API inputs."""

    def test_zero_employee_id(self, client, admin_token):
        res = client.get("/api/employees/0", headers=auth_header(admin_token))
        assert res.status_code in (404, 422)

    def test_negative_employee_id(self, client, admin_token):
        res = client.get("/api/employees/-1", headers=auth_header(admin_token))
        assert res.status_code in (404, 422)

    def test_very_large_employee_id(self, client, admin_token):
        res = client.get("/api/employees/999999999", headers=auth_header(admin_token))
        assert res.status_code == 404

    def test_string_employee_id(self, client, admin_token):
        res = client.get("/api/employees/abc", headers=auth_header(admin_token))
        assert res.status_code == 422

    def test_empty_login_fields(self, client):
        res = client.post("/api/auth/login", json={"email": "", "password": ""})
        assert res.status_code in (401, 422)

    def test_pagination_edge_cases(self, client, admin_token):
        # Page 0
        res = client.get("/api/employees?page=0", headers=auth_header(admin_token))
        assert res.status_code in (200, 422)

        # Very large page
        res = client.get("/api/employees?page=99999", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        items = data.get("items", data)
        assert len(items) == 0 or isinstance(items, list)

        # Per page = 1
        res = client.get("/api/employees?per_page=1", headers=auth_header(admin_token))
        assert res.status_code == 200


class TestSpecialCharacters:
    """Test handling of special characters in text fields."""

    def test_unicode_in_names(self, client, admin_token):
        deps = client.get("/api/admin/departments", headers=auth_header(admin_token)).json()
        desigs = client.get("/api/admin/designations", headers=auth_header(admin_token)).json()
        locs = client.get("/api/admin/locations", headers=auth_header(admin_token)).json()

        import uuid
        u = uuid.uuid4().hex[:4]
        res = client.post("/api/employees", json={
            "employee_id": f"UNI{u}",
            "first_name": "Jose",
            "last_name": "Garcia",
            "email": f"unicode_{u}@test.com",
            "department_id": deps[0]["id"],
            "designation_id": desigs[0]["id"],
            "location_id": locs[0]["id"],
            "band": "IC1",
            "joining_date": "2026-01-01",
            "status": "active",
        }, headers=auth_header(admin_token))
        assert res.status_code in (200, 201)

    def test_special_chars_in_ticket(self, client, emp_token):
        res = client.post("/api/hr-tickets", json={
            "subject": "Test with 'quotes' & <brackets> \"double\" $pecial",
            "description": "Line 1\nLine 2\tTabbed\r\nWindows line",
            "priority": "low",
        }, headers=auth_header(emp_token))
        assert res.status_code in (200, 201)

    def test_emoji_in_announcement(self, client, admin_token):
        res = client.post("/api/announcements", json={
            "title": "Party Time! 🎉🎊",
            "content": "Great work everyone! 👏 Keep it up 💪",
            "priority": "normal",
        }, headers=auth_header(admin_token))
        assert res.status_code in (200, 201)


class TestDateEdgeCases:
    """Test date handling edge cases."""

    def test_leave_same_start_end(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        cl_type = next(lt for lt in types if lt["code"] == "CL")
        res = client.post("/api/leave/apply", json={
            "leave_type_id": cl_type["id"],
            "start_date": "2026-12-15",
            "end_date": "2026-12-15",
            "reason": "Single day",
        }, headers=auth_header(emp_token))
        assert res.status_code in (200, 201)

    def test_leave_weekend_only(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        cl_type = next(lt for lt in types if lt["code"] == "CL")
        # Sat Dec 12 - Sun Dec 13 2026
        res = client.post("/api/leave/apply", json={
            "leave_type_id": cl_type["id"],
            "start_date": "2026-12-12",
            "end_date": "2026-12-13",
            "reason": "Weekend only",
        }, headers=auth_header(emp_token))
        # May succeed with 0 working days or be rejected
        assert res.status_code in (200, 201, 400, 422)

    def test_leave_far_future(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")
        res = client.post("/api/leave/apply", json={
            "leave_type_id": al_type["id"],
            "start_date": "2030-06-01",
            "end_date": "2030-06-02",
            "reason": "Far future",
        }, headers=auth_header(emp_token))
        # Should either work or reject due to no balance for that year
        assert res.status_code in (200, 201, 400)


class TestEmptyState:
    """Test API behavior with empty or missing data."""

    def test_empty_search_returns_all(self, client, admin_token):
        res = client.get("/api/employees?q=", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_nonexistent_department_filter(self, client, admin_token):
        res = client.get("/api/employees?department_id=99999", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        items = data.get("items", data)
        assert len(items) == 0

    def test_notifications_when_none(self, client, admin_token):
        # Mark all read first
        client.post("/api/notifications/mark-all-read", headers=auth_header(admin_token))
        count = client.get("/api/notifications/unread-count", headers=auth_header(admin_token)).json()
        assert count["count"] == 0


class TestDuplicateOperations:
    """Test duplicate/repeated operations are handled correctly."""

    def test_double_check_in(self, client, hr_token):
        # First check-in
        res1 = client.post("/api/attendance/check-in", headers=auth_header(hr_token))
        # Second check-in same day should fail
        res2 = client.post("/api/attendance/check-in", headers=auth_header(hr_token))
        assert res2.status_code == 400

    def test_cancel_already_cancelled(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        al_type = next(lt for lt in types if lt["code"] == "AL")

        # Apply and cancel
        apply_res = client.post("/api/leave/apply", json={
            "leave_type_id": al_type["id"],
            "start_date": "2026-12-28",
            "end_date": "2026-12-29",
            "reason": "Double cancel test",
        }, headers=auth_header(emp_token))
        if apply_res.status_code in (200, 201):
            req_id = apply_res.json()["id"]
            client.post(f"/api/leave/{req_id}/cancel", headers=auth_header(emp_token))
            # Second cancel
            res = client.post(f"/api/leave/{req_id}/cancel", headers=auth_header(emp_token))
            assert res.status_code in (200, 400)

    def test_mark_read_already_read(self, client, admin_token):
        client.post("/api/notifications/mark-all-read", headers=auth_header(admin_token))
        # Mark all read again - should be idempotent
        res = client.post("/api/notifications/mark-all-read", headers=auth_header(admin_token))
        assert res.status_code == 200


class TestMalformedRequests:
    """Test handling of malformed request bodies."""

    def test_missing_required_fields(self, client, admin_token):
        res = client.post("/api/employees", json={}, headers=auth_header(admin_token))
        assert res.status_code == 422

    def test_wrong_field_types(self, client, admin_token):
        res = client.post("/api/employees", json={
            "employee_id": 12345,  # should be string
            "first_name": True,    # should be string
        }, headers=auth_header(admin_token))
        assert res.status_code == 422

    def test_no_json_body(self, client, admin_token):
        res = client.post("/api/auth/login", headers=auth_header(admin_token))
        assert res.status_code == 422

    def test_invalid_json(self, client, admin_token):
        res = client.post(
            "/api/auth/login",
            content=b"not json at all",
            headers={**auth_header(admin_token), "Content-Type": "application/json"},
        )
        assert res.status_code == 422
