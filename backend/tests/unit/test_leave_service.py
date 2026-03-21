"""Unit tests for leave_service.py - leave day calculation and balance management."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from datetime import date
from unittest.mock import MagicMock, patch
from app.services.leave_service import (
    calculate_leave_days,
    check_leave_balance,
    update_leave_balance_on_apply,
    update_leave_balance_on_approve,
    update_leave_balance_on_reject,
)


def make_mock_db():
    """Create a mock DB session."""
    return MagicMock()


def make_mock_employee(location_id=1):
    emp = MagicMock()
    emp.location_id = location_id
    return emp


def make_mock_policy(exclude_weekends=True, exclude_holidays=True, allow_negative=False, is_active=True):
    policy = MagicMock()
    policy.exclude_weekends = exclude_weekends
    policy.exclude_holidays = exclude_holidays
    policy.allow_negative_balance = allow_negative
    policy.is_active = is_active
    return policy


def make_mock_balance(entitled=20, used=5, pending=2, carried_forward=0, adjusted=0):
    bal = MagicMock()
    bal.entitled = entitled
    bal.used = used
    bal.pending = pending
    bal.carried_forward = carried_forward
    bal.adjusted = adjusted
    return bal


class TestCalculateLeaveDays:
    def test_half_day_returns_half(self):
        db = make_mock_db()
        emp = make_mock_employee()
        result = calculate_leave_days(db, date(2026, 3, 2), date(2026, 3, 2), True, emp, 1)
        assert result == 0.5

    def test_single_weekday(self):
        db = make_mock_db()
        emp = make_mock_employee()
        policy = make_mock_policy(exclude_weekends=True, exclude_holidays=True)
        db.query().filter().first.return_value = policy
        # Also mock the holiday calendar query to return None
        db.query().filter().first.side_effect = [policy, None]

        result = calculate_leave_days(db, date(2026, 3, 23), date(2026, 3, 23), False, emp, 1)
        assert result == 1.0

    def test_weekend_excluded(self):
        db = make_mock_db()
        emp = make_mock_employee()
        policy = make_mock_policy(exclude_weekends=True)
        # Chain: first call returns policy, second returns None (no calendar)
        db.query().filter().first.side_effect = [policy, None]

        # Mon Mar 23 to Sun Mar 29 = 5 weekdays
        result = calculate_leave_days(db, date(2026, 3, 23), date(2026, 3, 29), False, emp, 1)
        assert result == 5.0

    def test_no_policy_defaults_to_exclude(self):
        db = make_mock_db()
        emp = make_mock_employee()
        db.query().filter().first.side_effect = [None, None]

        # Should still exclude weekends (default behavior)
        # Sat Mar 21 to Sun Mar 22 = 0 weekdays
        result = calculate_leave_days(db, date(2026, 3, 21), date(2026, 3, 22), False, emp, 1)
        assert result == 0.0


class TestCheckLeaveBalance:
    def test_sufficient_balance(self):
        db = make_mock_db()
        balance = make_mock_balance(entitled=20, used=5, pending=2, carried_forward=0, adjusted=0)
        # Available = 20 + 0 + 0 - 5 - 2 = 13
        db.query().filter().first.side_effect = [balance, None]  # balance, then policy

        sufficient, available, msg = check_leave_balance(db, 1, 1, 3.0, 2026)
        assert sufficient is True
        assert available == 13.0

    def test_insufficient_balance(self):
        db = make_mock_db()
        balance = make_mock_balance(entitled=10, used=8, pending=1, carried_forward=0, adjusted=0)
        # Available = 10 - 8 - 1 = 1
        policy = make_mock_policy(allow_negative=False)
        leave_type = MagicMock()
        leave_type.is_paid = True
        db.query().filter().first.side_effect = [balance, policy, leave_type]

        sufficient, available, msg = check_leave_balance(db, 1, 1, 5.0, 2026)
        assert sufficient is False
        assert available == 1.0
        assert "Insufficient" in msg

    def test_no_balance_found(self):
        db = make_mock_db()
        db.query().filter().first.return_value = None

        sufficient, available, msg = check_leave_balance(db, 1, 1, 1.0, 2026)
        assert sufficient is False
        assert available == 0
        assert "No leave balance" in msg

    def test_negative_balance_allowed(self):
        db = make_mock_db()
        balance = make_mock_balance(entitled=5, used=5, pending=0)
        policy = make_mock_policy(allow_negative=True)
        db.query().filter().first.side_effect = [balance, policy]

        sufficient, available, msg = check_leave_balance(db, 1, 1, 3.0, 2026)
        assert sufficient is True
        assert "negative balance" in msg.lower()

    def test_unpaid_leave_bypasses_balance(self):
        db = make_mock_db()
        balance = make_mock_balance(entitled=0, used=0, pending=0)
        policy = make_mock_policy(allow_negative=False)
        leave_type = MagicMock()
        leave_type.is_paid = False
        db.query().filter().first.side_effect = [balance, policy, leave_type]

        sufficient, available, msg = check_leave_balance(db, 1, 1, 5.0, 2026)
        assert sufficient is True
        assert "Unpaid" in msg


class TestUpdateLeaveBalance:
    def test_apply_adds_pending(self):
        db = make_mock_db()
        balance = make_mock_balance(pending=0)
        db.query().filter().first.return_value = balance

        update_leave_balance_on_apply(db, 1, 1, 3.0, 2026)
        assert balance.pending == 3.0
        db.commit.assert_called_once()

    def test_approve_moves_pending_to_used(self):
        db = make_mock_db()
        balance = make_mock_balance(pending=3.0, used=2.0)
        db.query().filter().first.return_value = balance

        update_leave_balance_on_approve(db, 1, 1, 3.0, 2026)
        assert balance.pending == 0.0
        assert balance.used == 5.0
        db.commit.assert_called_once()

    def test_reject_removes_pending(self):
        db = make_mock_db()
        balance = make_mock_balance(pending=3.0)
        db.query().filter().first.return_value = balance

        update_leave_balance_on_reject(db, 1, 1, 3.0, 2026)
        assert balance.pending == 0.0
        db.commit.assert_called_once()

    def test_reject_pending_doesnt_go_negative(self):
        db = make_mock_db()
        balance = make_mock_balance(pending=1.0)
        db.query().filter().first.return_value = balance

        update_leave_balance_on_reject(db, 1, 1, 5.0, 2026)
        assert balance.pending == 0.0  # max(0, 1-5) = 0

    def test_no_balance_record_is_safe(self):
        db = make_mock_db()
        db.query().filter().first.return_value = None

        # Should not raise
        update_leave_balance_on_apply(db, 1, 1, 3.0, 2026)
        db.commit.assert_not_called()
