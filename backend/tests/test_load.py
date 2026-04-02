"""Load and stress tests for API endpoints.

Tests API performance under concurrent-like load:
- Multiple rapid sequential requests
- Bulk data operations
- Response time thresholds
"""

import time
from tests.conftest import auth_header


class TestResponseTime:
    """Verify key endpoints respond within acceptable time thresholds."""

    def test_login_response_time(self, client):
        start = time.time()
        for _ in range(10):
            client.post("/api/auth/login", json={
                "email": "admin@test.com", "password": "admin123",
            })
        elapsed = time.time() - start
        avg = elapsed / 10
        assert avg < 2.0, f"Login avg {avg:.2f}s exceeds 2s threshold"

    def test_employee_list_response_time(self, client, admin_token):
        start = time.time()
        for _ in range(20):
            client.get("/api/employees", headers=auth_header(admin_token))
        elapsed = time.time() - start
        avg = elapsed / 20
        assert avg < 1.0, f"Employee list avg {avg:.2f}s exceeds 1s threshold"

    def test_dashboard_response_time(self, client, admin_token):
        start = time.time()
        for _ in range(20):
            client.get("/api/dashboard/stats", headers=auth_header(admin_token))
        elapsed = time.time() - start
        avg = elapsed / 20
        assert avg < 1.0, f"Dashboard avg {avg:.2f}s exceeds 1s threshold"

    def test_notification_check_response_time(self, client, emp_token):
        start = time.time()
        for _ in range(50):
            client.get("/api/notifications/unread-count", headers=auth_header(emp_token))
        elapsed = time.time() - start
        avg = elapsed / 50
        assert avg < 0.5, f"Notification count avg {avg:.2f}s exceeds 0.5s threshold"


class TestBulkOperations:
    """Test API behavior under bulk data operations."""

    def test_rapid_leave_applications(self, client, emp_token):
        types = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        results = []
        # Use different leave types and dates within 2026 (where we have balances)
        for i, code in enumerate(["AL", "SL", "CL"]):
            lt = next((t for t in types if t["code"] == code), None)
            if lt:
                res = client.post("/api/leave/apply", json={
                    "leave_type_id": lt["id"],
                    "start_date": f"2026-0{i+4}-20",
                    "end_date": f"2026-0{i+4}-21",
                    "reason": f"Bulk test {i}",
                }, headers=auth_header(emp_token))
                results.append(res.status_code)
        # At least some should succeed
        successes = sum(1 for s in results if s in (200, 201))
        assert successes >= 1, f"All leave applications failed: {results}"

    def test_rapid_notification_reads(self, client, admin_token):
        """Test marking many notifications as read rapidly."""
        for _ in range(10):
            client.post("/api/notifications/mark-all-read", headers=auth_header(admin_token))
        # Final count should be 0
        count = client.get("/api/notifications/unread-count", headers=auth_header(admin_token)).json()
        assert count["count"] == 0

    def test_multiple_announcement_creates(self, client, admin_token):
        start = time.time()
        for i in range(10):
            res = client.post("/api/announcements", json={
                "title": f"Bulk Announcement {i}",
                "content": f"Content {i}",
                "priority": "normal",
            }, headers=auth_header(admin_token))
            assert res.status_code in (200, 201)
        elapsed = time.time() - start
        assert elapsed < 30, f"10 announcements took {elapsed:.1f}s"

    def test_rapid_attendance_check(self, client, admin_token):
        """Multiple users checking in rapidly."""
        tokens = []
        for email, pwd in [("admin@test.com", "admin123"), ("hr@test.com", "hr123")]:
            res = client.post("/api/auth/login", json={"email": email, "password": pwd})
            tokens.append(res.json()["access_token"])

        start = time.time()
        for token in tokens:
            client.post("/api/attendance/check-in", headers=auth_header(token))
            client.post("/api/attendance/check-out", headers=auth_header(token))
        elapsed = time.time() - start
        assert elapsed < 10, f"Attendance ops took {elapsed:.1f}s"


class TestEndpointStability:
    """Test that endpoints remain stable under repeated access."""

    def test_health_check_stability(self, client):
        for _ in range(100):
            res = client.get("/api/health")
            assert res.status_code == 200

    def test_auth_me_stability(self, client, admin_token):
        for _ in range(50):
            res = client.get("/api/auth/me", headers=auth_header(admin_token))
            assert res.status_code == 200
            assert res.json()["email"] == "admin@test.com"

    def test_leave_types_caching(self, client, emp_token):
        """Verify consistent data across repeated reads."""
        first = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
        for _ in range(20):
            res = client.get("/api/leave/types", headers=auth_header(emp_token)).json()
            assert len(res) == len(first)
            assert all(r["code"] == f["code"] for r, f in zip(res, first))
