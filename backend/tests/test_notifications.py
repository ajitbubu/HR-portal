"""E2E tests for notification endpoints."""

from tests.conftest import auth_header


class TestGetNotifications:
    def test_get_notifications(self, client, emp_token):
        res = client.get("/api/notifications", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_get_unread_only(self, client, emp_token):
        res = client.get("/api/notifications?unread_only=true", headers=auth_header(emp_token))
        assert res.status_code == 200

    def test_no_auth(self, client):
        res = client.get("/api/notifications")
        assert res.status_code in (401, 403)


class TestUnreadCount:
    def test_unread_count(self, client, emp_token):
        res = client.get("/api/notifications/unread-count", headers=auth_header(emp_token))
        assert res.status_code == 200
        data = res.json()
        assert "count" in data
        assert isinstance(data["count"], int)


class TestMarkRead:
    def test_mark_all_read(self, client, admin_token):
        res = client.post("/api/notifications/mark-all-read", headers=auth_header(admin_token))
        assert res.status_code == 200
        # Verify count is 0
        count_res = client.get("/api/notifications/unread-count", headers=auth_header(admin_token))
        assert count_res.json()["count"] == 0

    def test_mark_single_read(self, client, hr_token):
        # Get notifications to find one to mark
        notifs = client.get("/api/notifications", headers=auth_header(hr_token)).json()
        if notifs:
            notif_id = notifs[0]["id"]
            res = client.post(f"/api/notifications/{notif_id}/read", headers=auth_header(hr_token))
            assert res.status_code == 200
