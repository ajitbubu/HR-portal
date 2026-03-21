"""E2E tests for profile photo upload."""

import io
from tests.conftest import auth_header


def get_employees(client, token):
    """Helper to get employee list items from paginated response."""
    res = client.get("/api/employees", headers=auth_header(token))
    data = res.json()
    return data.get("items", data) if isinstance(data, dict) else data


def make_fake_image(filename="test.png", content_type="image/png"):
    """Create a minimal fake image file for upload testing."""
    png_data = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
        b'\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00'
        b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    return ("file", (filename, io.BytesIO(png_data), content_type))


class TestSelfUpload:
    def test_upload_own_photo(self, client, emp_token):
        res = client.post(
            "/api/employees/profile-photo/upload",
            files=[make_fake_image()],
            headers=auth_header(emp_token),
        )
        assert res.status_code in (200, 201)

    def test_upload_invalid_type(self, client, emp_token):
        res = client.post(
            "/api/employees/profile-photo/upload",
            files=[("file", ("test.txt", io.BytesIO(b"not an image"), "text/plain"))],
            headers=auth_header(emp_token),
        )
        assert res.status_code == 400

    def test_upload_no_auth(self, client):
        res = client.post(
            "/api/employees/profile-photo/upload",
            files=[make_fake_image()],
        )
        assert res.status_code in (401, 403)


class TestAdminUpload:
    def test_admin_upload_for_employee(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[-1]["id"]
        res = client.post(
            f"/api/employees/{emp_id}/profile-photo",
            files=[make_fake_image("admin_upload.png")],
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)

    def test_employee_cannot_upload_for_others(self, client, emp_token):
        res = client.post(
            "/api/employees/1/profile-photo",
            files=[make_fake_image()],
            headers=auth_header(emp_token),
        )
        assert res.status_code == 403
