"""E2E tests for dashboard endpoints: stats and celebrations."""

from tests.conftest import auth_header


class TestDashboardStats:
    def test_admin_stats_shape(self, client, admin_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        for key in ["total_employees", "active_employees", "on_leave_today",
                    "absent_today", "pending_approvals", "new_hires_this_month",
                    "upcoming_holidays", "pending_tickets", "announcements_count"]:
            assert key in data, f"Missing key: {key}"

    def test_employee_stats(self, client, emp_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(emp_token))
        assert res.status_code == 200
        data = res.json()
        assert data["total_employees"] >= 4

    def test_manager_stats(self, client, mgr_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(mgr_token))
        assert res.status_code == 200

    def test_unauthenticated_stats(self, client):
        res = client.get("/api/dashboard/stats")
        assert res.status_code in (401, 403)

    def test_stats_counts_non_negative(self, client, admin_token):
        res = client.get("/api/dashboard/stats", headers=auth_header(admin_token))
        data = res.json()
        for key, val in data.items():
            assert val >= 0, f"{key} should be non-negative, got {val}"


class TestDashboardCelebrations:
    def test_celebrations_returns_list(self, client, admin_token):
        res = client.get("/api/dashboard/celebrations?days=365", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_celebrations_item_shape(self, client, admin_token):
        res = client.get("/api/dashboard/celebrations?days=365", headers=auth_header(admin_token))
        assert res.status_code == 200
        items = res.json()
        for item in items:
            assert "id" in item
            assert "name" in item
            assert "type" in item
            assert item["type"] in ("birthday", "anniversary")
            assert "days_away" in item
            assert "date" in item
            assert "label" in item
            assert item["days_away"] >= 0

    def test_celebrations_sorted_by_days_away(self, client, admin_token):
        res = client.get("/api/dashboard/celebrations?days=365", headers=auth_header(admin_token))
        items = res.json()
        if len(items) >= 2:
            days = [i["days_away"] for i in items]
            assert days == sorted(days), "Celebrations should be sorted by days_away"

    def test_celebrations_default_30_days(self, client, emp_token):
        res = client.get("/api/dashboard/celebrations", headers=auth_header(emp_token))
        assert res.status_code == 200
        items = res.json()
        for item in items:
            assert item["days_away"] <= 30

    def test_celebrations_zero_days(self, client, admin_token):
        """days=0 returns only today's celebrations."""
        res = client.get("/api/dashboard/celebrations?days=0", headers=auth_header(admin_token))
        assert res.status_code == 200
        items = res.json()
        for item in items:
            assert item["days_away"] == 0

    def test_celebrations_unauthenticated(self, client):
        res = client.get("/api/dashboard/celebrations")
        assert res.status_code in (401, 403)

    def test_celebrations_employee_access(self, client, emp_token):
        """All roles can access celebrations."""
        res = client.get("/api/dashboard/celebrations?days=365", headers=auth_header(emp_token))
        assert res.status_code == 200
