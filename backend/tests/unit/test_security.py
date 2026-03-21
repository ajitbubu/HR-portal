"""Unit tests for core/security.py - password hashing and JWT operations."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from datetime import timedelta
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


class TestPasswordHashing:
    def test_hash_returns_string(self):
        hashed = hash_password("secret123")
        assert isinstance(hashed, str)
        assert hashed != "secret123"

    def test_hash_produces_unique_hashes(self):
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2  # bcrypt salts differ

    def test_verify_correct_password(self):
        hashed = hash_password("correct_password")
        assert verify_password("correct_password", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_verify_empty_password(self):
        hashed = hash_password("notempty")
        assert verify_password("", hashed) is False

    def test_hash_empty_password(self):
        hashed = hash_password("")
        assert isinstance(hashed, str)
        assert verify_password("", hashed) is True


class TestJWT:
    def test_create_and_decode_token(self):
        data = {"sub": "42", "role": "employee"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "42"
        assert decoded["role"] == "employee"
        assert "exp" in decoded

    def test_token_with_custom_expiry(self):
        data = {"sub": "1"}
        token = create_access_token(data, expires_delta=timedelta(minutes=5))
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "1"

    def test_decode_invalid_token(self):
        result = decode_access_token("not.a.valid.token")
        assert result is None

    def test_decode_empty_string(self):
        result = decode_access_token("")
        assert result is None

    def test_token_preserves_all_data(self):
        data = {"sub": "10", "role": "hr_admin", "custom": "value"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        assert decoded["sub"] == "10"
        assert decoded["role"] == "hr_admin"
        assert decoded["custom"] == "value"

    def test_original_data_not_mutated(self):
        data = {"sub": "1"}
        original_keys = set(data.keys())
        create_access_token(data)
        assert set(data.keys()) == original_keys  # "exp" not added to original
