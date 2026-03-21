"""Unit tests for notification_service.py."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from unittest.mock import MagicMock, call
from app.services.notification_service import (
    create_notification,
    notify_all_active_users,
    notify_hr_admins,
    get_unread_count,
)


class TestCreateNotification:
    def test_creates_and_commits(self):
        db = MagicMock()
        result = create_notification(db, 1, "Test Title", "Test Message", "info", "/link")
        db.add.assert_called_once()
        db.commit.assert_called_once()
        assert result is not None

    def test_default_type_is_info(self):
        db = MagicMock()
        create_notification(db, 1, "Title", "Msg")
        notif = db.add.call_args[0][0]
        assert notif.type == "info"

    def test_with_link(self):
        db = MagicMock()
        create_notification(db, 1, "Title", "Msg", link="/dashboard")
        notif = db.add.call_args[0][0]
        assert notif.link == "/dashboard"


class TestNotifyAllActiveUsers:
    def test_notifies_all_active(self):
        db = MagicMock()
        user1 = MagicMock(id=1, is_active=True)
        user2 = MagicMock(id=2, is_active=True)
        user3 = MagicMock(id=3, is_active=True)
        db.query().filter().all.return_value = [user1, user2, user3]

        notify_all_active_users(db, "Announcement", "Content")
        assert db.add.call_count == 3
        db.commit.assert_called_once()

    def test_excludes_specified_user(self):
        db = MagicMock()
        user1 = MagicMock(id=1)
        user2 = MagicMock(id=2)
        db.query().filter().all.return_value = [user1, user2]

        notify_all_active_users(db, "Title", "Msg", exclude_user_id=1)
        assert db.add.call_count == 1  # only user2

    def test_empty_users_list(self):
        db = MagicMock()
        db.query().filter().all.return_value = []

        notify_all_active_users(db, "Title", "Msg")
        assert db.add.call_count == 0
        db.commit.assert_called_once()


class TestNotifyHrAdmins:
    def test_notifies_hr_and_super_admin(self):
        db = MagicMock()
        hr = MagicMock(id=1, role="hr_admin")
        admin = MagicMock(id=2, role="super_admin")
        db.query().filter().all.return_value = [hr, admin]

        notify_hr_admins(db, "New Ticket", "Details")
        assert db.add.call_count == 2
        db.commit.assert_called_once()

    def test_no_hr_admins(self):
        db = MagicMock()
        db.query().filter().all.return_value = []

        notify_hr_admins(db, "Title", "Msg")
        assert db.add.call_count == 0


class TestGetUnreadCount:
    def test_returns_count(self):
        db = MagicMock()
        db.query().filter().count.return_value = 5
        assert get_unread_count(db, 1) == 5

    def test_zero_unread(self):
        db = MagicMock()
        db.query().filter().count.return_value = 0
        assert get_unread_count(db, 1) == 0
