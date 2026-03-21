"""E2E tests for employee endpoints."""

from tests.conftest import auth_header


def get_employees(client, token):
    """Helper to get employee list items from paginated response."""
    res = client.get("/api/employees", headers=auth_header(token))
    data = res.json()
    return data.get("items", data) if isinstance(data, dict) else data


class TestListEmployees:
    def test_list_as_admin(self, client, admin_token):
        res = client.get("/api/employees", headers=auth_header(admin_token))
        assert res.status_code == 200
        data = res.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) >= 4

    def test_list_as_employee(self, client, emp_token):
        res = client.get("/api/employees", headers=auth_header(emp_token))
        assert res.status_code == 200

    def test_list_no_auth(self, client):
        res = client.get("/api/employees")
        assert res.status_code in (401, 403)


class TestGetEmployee:
    def test_get_by_id(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[0]["id"]
        res = client.get(f"/api/employees/{emp_id}", headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["id"] == emp_id

    def test_get_nonexistent(self, client, admin_token):
        res = client.get("/api/employees/99999", headers=auth_header(admin_token))
        assert res.status_code == 404


class TestCreateEmployee:
    def test_create_as_admin(self, client, admin_token):
        employees = get_employees(client, admin_token)
        sample = employees[0]

        res = client.post(
            "/api/employees",
            json={
                "employee_id": "TEST099",
                "first_name": "New",
                "last_name": "Hire",
                "email": "newhire@test.com",
                "department_id": sample.get("department", {}).get("id") or sample.get("department_id"),
                "designation_id": sample.get("designation", {}).get("id") or sample.get("designation_id"),
                "location_id": sample.get("location", {}).get("id") or sample.get("location_id"),
                "band": "IC1",
                "joining_date": "2026-03-01",
                "status": "active",
            },
            headers=auth_header(admin_token),
        )
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["first_name"] == "New"

    def test_create_as_employee_forbidden(self, client, emp_token):
        res = client.post(
            "/api/employees",
            json={
                "employee_id": "FAIL001",
                "first_name": "Should",
                "last_name": "Fail",
                "email": "fail@test.com",
                "department_id": 1,
                "designation_id": 1,
                "location_id": 1,
                "band": "IC1",
                "joining_date": "2026-01-01",
                "status": "active",
            },
            headers=auth_header(emp_token),
        )
        assert res.status_code == 403


class TestUpdateEmployee:
    def test_update_as_admin(self, client, admin_token):
        employees = get_employees(client, admin_token)
        emp_id = employees[0]["id"]
        res = client.put(
            f"/api/employees/{emp_id}",
            json={"first_name": "Updated"},
            headers=auth_header(admin_token),
        )
        assert res.status_code == 200

    def test_update_as_employee_forbidden(self, client, emp_token):
        res = client.put(
            "/api/employees/1",
            json={"first_name": "Nope"},
            headers=auth_header(emp_token),
        )
        assert res.status_code == 403


class TestDeactivateEmployee:
    def test_deactivate_as_admin(self, client, admin_token):
        employees = get_employees(client, admin_token)
        sample = employees[0]
        import uuid
        unique = uuid.uuid4().hex[:6]
        create_res = client.post(
            "/api/employees",
            json={
                "employee_id": f"D{unique}",
                "first_name": "To",
                "last_name": "Deactivate",
                "email": f"deact_{unique}@test.com",
                "department_id": sample.get("department", {}).get("id") or sample.get("department_id"),
                "designation_id": sample.get("designation", {}).get("id") or sample.get("designation_id"),
                "location_id": sample.get("location", {}).get("id") or sample.get("location_id"),
                "band": "IC1",
                "joining_date": "2026-01-01",
                "status": "active",
            },
            headers=auth_header(admin_token),
        )
        if create_res.status_code in (200, 201):
            emp_id = create_res.json()["id"]
            res = client.delete(f"/api/employees/{emp_id}", headers=auth_header(admin_token))
            assert res.status_code == 200
