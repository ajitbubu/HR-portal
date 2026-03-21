"""Unit tests for core/dependencies.py - authentication and role-based access."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.core.dependencies import get_current_user, require_roles
from app.core.security import create_access_token


class TestGetCurrentUser:
    def test_valid_token_returns_user(self):
        token = create_access_token({"sub": "1", "role": "employee"})
        db = MagicMock()
        mock_user = MagicMock()
        mock_user.is_active = True
        db.query().filter().first.return_value = mock_user

        result = get_current_user(token=token, db=db)
        assert result == mock_user

    def test_invalid_token_raises_401(self):
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token="invalid.token.here", db=db)
        assert exc_info.value.status_code == 401

    def test_user_not_found_raises_401(self):
        token = create_access_token({"sub": "999", "role": "employee"})
        db = MagicMock()
        db.query().filter().first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=db)
        assert exc_info.value.status_code == 401

    def test_inactive_user_raises_401(self):
        token = create_access_token({"sub": "1", "role": "employee"})
        db = MagicMock()
        mock_user = MagicMock()
        mock_user.is_active = False
        db.query().filter().first.return_value = mock_user

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=db)
        assert exc_info.value.status_code == 401


class TestRequireRoles:
    def test_allowed_role(self):
        checker = require_roles("super_admin", "hr_admin")
        mock_user = MagicMock()
        mock_user.role = "super_admin"

        result = checker(current_user=mock_user)
        assert result == mock_user

    def test_forbidden_role(self):
        checker = require_roles("super_admin", "hr_admin")
        mock_user = MagicMock()
        mock_user.role = "employee"

        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=mock_user)
        assert exc_info.value.status_code == 403

    def test_single_role(self):
        checker = require_roles("super_admin")
        mock_user = MagicMock()
        mock_user.role = "super_admin"

        result = checker(current_user=mock_user)
        assert result == mock_user

    def test_manager_role_not_admin(self):
        checker = require_roles("super_admin", "hr_admin")
        mock_user = MagicMock()
        mock_user.role = "manager"

        with pytest.raises(HTTPException) as exc_info:
            checker(current_user=mock_user)
        assert exc_info.value.status_code == 403
