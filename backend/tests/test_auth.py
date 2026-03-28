"""E2E tests for authentication endpoints."""

from tests.conftest import auth_header


class TestLogin:
    def test_login_success(self, client):
        res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "super_admin"

    def test_login_wrong_password(self, client):
        res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"})
        assert res.status_code == 401

    def test_login_all_roles(self, client):
        """Verify all seeded users can log in."""
        users = [
            ("admin@test.com", "admin123", "super_admin"),
            ("hr@test.com", "hr123", "hr_admin"),
            ("manager@test.com", "mgr123", "manager"),
            ("employee@test.com", "emp123", "employee"),
        ]
        for email, pwd, role in users:
            res = client.post("/api/auth/login", json={"email": email, "password": pwd})
            assert res.status_code == 200
            assert res.json()["role"] == role


class TestRegister:
    def test_register_success(self, client):
        import uuid
        unique = uuid.uuid4().hex[:8]
        res = client.post(
            "/api/auth/register",
            json={"email": f"reg_{unique}@test.com", "password": "newpass123", "first_name": "Reg", "last_name": "User", "role": "employee"},
        )
        assert res.status_code in (200, 201)

    def test_register_duplicate_email(self, client):
        res = client.post(
            "/api/auth/register",
            json={"email": "admin@test.com", "password": "xxx", "first_name": "Dup", "last_name": "User", "role": "employee"},
        )
        assert res.status_code in (400, 409)


class TestMe:
    def test_get_me_admin(self, client, admin_token):
        res = client.get("/api/auth/me", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "super_admin"

    def test_get_me_employee(self, client, emp_token):
        res = client.get("/api/auth/me", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["role"] == "employee"

    def test_get_me_no_token(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code in (401, 403)

    def test_get_me_invalid_token(self, client):
        res = client.get("/api/auth/me", headers=auth_header("invalid.token.here"))
        assert res.status_code in (401, 403)

    def test_get_me_malformed_bearer(self, client):
        res = client.get("/api/auth/me", headers={"Authorization": "NotBearer abc"})
        assert res.status_code in (401, 403)


class TestLoginTokenShape:
    def test_token_response_has_required_fields(self, client):
        res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
        data = res.json()
        assert "access_token" in data
        assert "token_type" in data
        assert "role" in data
        assert "user_id" in data
        assert data["token_type"] == "bearer"

    def test_token_is_string(self, client):
        res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
        token = res.json()["access_token"]
        assert isinstance(token, str)
        # JWT tokens have 3 parts separated by dots
        assert len(token.split(".")) == 3

    def test_login_empty_body(self, client):
        res = client.post("/api/auth/login", json={})
        assert res.status_code == 422

    def test_login_missing_password(self, client):
        res = client.post("/api/auth/login", json={"email": "admin@test.com"})
        assert res.status_code == 422

    def test_login_missing_email(self, client):
        res = client.post("/api/auth/login", json={"password": "admin123"})
        assert res.status_code == 422


class TestInactiveUser:
    def test_inactive_user_cannot_login(self, client, db):
        """Create an inactive user and verify they cannot log in."""
        from app.models.user import User
        from app.core.security import hash_password

        u = User(email="inactive@test.com", password_hash=hash_password("pass123"),
                 role="employee", is_active=False)
        db.add(u)
        db.commit()

        res = client.post("/api/auth/login", json={"email": "inactive@test.com", "password": "pass123"})
        assert res.status_code in (401, 403)
