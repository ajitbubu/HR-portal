"""Unit tests for Pydantic schema validation."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from pydantic import ValidationError
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.employee import EmployeeCreate
from app.schemas.leave import LeaveApplyRequest


class TestLoginRequest:
    def test_valid_login(self):
        req = LoginRequest(email="user@test.com", password="pass123")
        assert req.email == "user@test.com"
        assert req.password == "pass123"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="not-an-email", password="pass")

    def test_missing_password(self):
        with pytest.raises(ValidationError):
            LoginRequest(email="user@test.com")

    def test_missing_email(self):
        with pytest.raises(ValidationError):
            LoginRequest(password="pass123")


class TestRegisterRequest:
    def test_valid_register(self):
        req = RegisterRequest(
            email="new@test.com", password="pass123",
            first_name="John", last_name="Doe", role="employee",
        )
        assert req.first_name == "John"

    def test_default_role(self):
        req = RegisterRequest(
            email="new@test.com", password="pass123",
            first_name="Jane", last_name="Doe",
        )
        assert req.role == "employee"


class TestTokenResponse:
    def test_valid_token(self):
        resp = TokenResponse(
            access_token="abc.def.ghi", user_id=1,
            role="employee", employee_id=1, name="Test",
        )
        assert resp.token_type == "bearer"
        assert resp.access_token == "abc.def.ghi"

    def test_default_token_type(self):
        resp = TokenResponse(
            access_token="x", user_id=1, role="admin",
        )
        assert resp.token_type == "bearer"


class TestUserResponse:
    def test_valid_user_response(self):
        resp = UserResponse(
            id=1, email="admin@test.com", role="super_admin",
            is_active=True, employee_id=1, name="Admin User",
        )
        assert resp.id == 1
        assert resp.is_active is True

    def test_optional_fields(self):
        resp = UserResponse(id=1, email="u@t.com", role="e", is_active=True)
        assert resp.employee_id is None
        assert resp.name is None


class TestLeaveApplyRequest:
    def test_valid_leave_request(self):
        req = LeaveApplyRequest(
            leave_type_id=1,
            start_date="2026-04-01",
            end_date="2026-04-03",
            reason="Vacation",
        )
        assert req.leave_type_id == 1

    def test_missing_required_fields(self):
        with pytest.raises(ValidationError):
            LeaveApplyRequest(leave_type_id=1)

    def test_half_day_default(self):
        req = LeaveApplyRequest(
            leave_type_id=1,
            start_date="2026-04-01",
            end_date="2026-04-01",
            reason="Test",
        )
        assert req.is_half_day is False


class TestEmployeeCreate:
    def test_valid_employee(self):
        emp = EmployeeCreate(
            employee_id="TEST001",
            first_name="Test",
            last_name="User",
            email="test@company.com",
            joining_date="2026-01-01",
            status="active",
        )
        assert emp.first_name == "Test"

    def test_missing_required(self):
        with pytest.raises(ValidationError):
            EmployeeCreate(first_name="Only")
