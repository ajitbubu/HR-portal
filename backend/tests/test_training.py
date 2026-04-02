"""E2E tests for Training & Learning Management."""
from tests.conftest import auth_header


class TestCourses:
    def test_create_course(self, client, hr_token):
        res = client.post("/api/training/courses", json={
            "title": "React Basics", "category": "Technical",
            "duration_hours": 10, "format": "online",
            "instructor": "Jane Doe", "max_participants": 20,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["title"] == "React Basics"

    def test_list_courses(self, client, emp_token):
        res = client.get("/api/training/courses", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 2

    def test_get_course(self, client, emp_token):
        res = client.get("/api/training/courses/1", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["title"] == "Python Advanced"

    def test_update_course(self, client, hr_token):
        res = client.put("/api/training/courses/1", json={
            "duration_hours": 25,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["duration_hours"] == 25

    def test_employee_cannot_create_course(self, client, emp_token):
        res = client.post("/api/training/courses", json={
            "title": "Nope",
        }, headers=auth_header(emp_token))
        assert res.status_code == 403


class TestEnrollments:
    def test_self_enroll(self, client, emp_token):
        res = client.post("/api/training/enrollments", json={
            "course_id": 2,
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["status"] == "enrolled"

    def test_my_enrollments(self, client, emp_token):
        res = client.get("/api/training/enrollments/my", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_update_progress(self, client, emp_token):
        enrollments = client.get("/api/training/enrollments/my", headers=auth_header(emp_token))
        eid = enrollments.json()[0]["id"]
        res = client.put(f"/api/training/enrollments/{eid}", json={
            "progress": 75, "score": 85,
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["progress"] == 75

    def test_team_enrollments(self, client, mgr_token):
        res = client.get("/api/training/enrollments/team", headers=auth_header(mgr_token))
        assert res.status_code == 200


class TestCertifications:
    def test_create_certification(self, client, hr_token):
        res = client.post("/api/training/certifications", json={
            "name": "GCP Professional", "issuing_body": "Google",
            "validity_months": 24,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200

    def test_list_certifications(self, client, emp_token):
        res = client.get("/api/training/certifications", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_assign_certification(self, client, hr_token):
        res = client.post("/api/training/certifications/assign", json={
            "employee_id": 4, "certification_id": 1,
            "issued_date": "2026-01-15", "expiry_date": "2029-01-15",
            "credential_id": "AWS-12345",
        }, headers=auth_header(hr_token))
        assert res.status_code == 200

    def test_my_certifications(self, client, emp_token):
        res = client.get("/api/training/certifications/my", headers=auth_header(emp_token))
        assert res.status_code == 200


class TestLearningPaths:
    def test_list_paths(self, client, emp_token):
        res = client.get("/api/training/learning-paths", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_get_path(self, client, emp_token):
        res = client.get("/api/training/learning-paths/1", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["name"] == "Engineering Track"
        assert len(res.json()["courses"]) >= 2


class TestCompliance:
    def test_assign_compliance(self, client, hr_token):
        res = client.post("/api/training/compliance/assign", json={
            "employee_id": 3, "course_id": 2, "due_date": "2026-07-31",
        }, headers=auth_header(hr_token))
        assert res.status_code == 200

    def test_compliance_report(self, client, hr_token):
        res = client.get("/api/training/compliance/report", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert len(res.json()) >= 1
