"""E2E tests for Recruitment / ATS."""
import io
from tests.conftest import auth_header


class TestJobPostings:
    def test_create_posting(self, client, hr_token):
        res = client.post("/api/recruitment/postings", json={
            "title": "QA Engineer", "description": "Testing expert needed",
            "salary_min": 80000, "salary_max": 120000, "positions_count": 1,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["title"] == "QA Engineer"
        assert res.json()["status"] == "draft"

    def test_list_postings(self, client, hr_token):
        res = client.get("/api/recruitment/postings", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 2

    def test_get_posting(self, client, hr_token):
        res = client.get("/api/recruitment/postings/1", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["title"] == "Senior Engineer"

    def test_update_posting(self, client, hr_token):
        res = client.put("/api/recruitment/postings/1", json={
            "positions_count": 3,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["positions_count"] == 3

    def test_publish_posting(self, client, hr_token):
        # Create and publish
        create = client.post("/api/recruitment/postings", json={
            "title": "Test Publish", "description": "To publish",
        }, headers=auth_header(hr_token))
        pid = create.json()["id"]
        res = client.post(f"/api/recruitment/postings/{pid}/publish", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "open"

    def test_close_posting(self, client, hr_token):
        create = client.post("/api/recruitment/postings", json={
            "title": "To Close",
        }, headers=auth_header(hr_token))
        pid = create.json()["id"]
        client.post(f"/api/recruitment/postings/{pid}/publish", headers=auth_header(hr_token))
        res = client.post(f"/api/recruitment/postings/{pid}/close", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "closed"

    def test_employee_cannot_create(self, client, emp_token):
        res = client.post("/api/recruitment/postings", json={
            "title": "Nope",
        }, headers=auth_header(emp_token))
        assert res.status_code == 403


class TestCandidates:
    def test_add_candidate(self, client, hr_token):
        res = client.post("/api/recruitment/candidates", json={
            "job_posting_id": 1, "first_name": "Charlie", "last_name": "Brown",
            "email": "charlie@example.com", "source": "website",
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "applied"

    def test_list_candidates(self, client, hr_token):
        res = client.get("/api/recruitment/candidates", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 3

    def test_get_candidate(self, client, hr_token):
        res = client.get("/api/recruitment/candidates/1", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["first_name"] == "Alice"

    def test_advance_status(self, client, hr_token):
        res = client.post("/api/recruitment/candidates/1/advance", json={
            "status": "interview",
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "interview"

    def test_invalid_advance(self, client, hr_token):
        # Can't go from interview to applied
        res = client.post("/api/recruitment/candidates/1/advance", json={
            "status": "applied",
        }, headers=auth_header(hr_token))
        assert res.status_code == 400


class TestInterviews:
    def test_schedule_interview(self, client, hr_token):
        res = client.post("/api/recruitment/interviews", json={
            "candidate_id": 1, "interviewer_id": 3,
            "scheduled_at": "2026-04-20T14:00:00Z",
            "interview_type": "video", "duration_minutes": 45,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "scheduled"

    def test_submit_feedback(self, client, mgr_token):
        interviews = client.get("/api/recruitment/interviews", headers=auth_header(mgr_token))
        if interviews.json():
            iid = interviews.json()[0]["id"]
            res = client.post(f"/api/recruitment/interviews/{iid}/feedback", json={
                "feedback": "Strong candidate", "rating": 4.5,
            }, headers=auth_header(mgr_token))
            assert res.status_code == 200
            assert res.json()["status"] == "completed"


class TestOffers:
    def test_create_offer(self, client, hr_token):
        res = client.post("/api/recruitment/offers", json={
            "candidate_id": 2, "position_title": "Senior Engineer",
            "salary": 150000, "start_date": "2026-05-01",
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "draft"

    def test_send_offer(self, client, hr_token):
        # Create and send
        create = client.post("/api/recruitment/offers", json={
            "candidate_id": 1, "position_title": "QA Lead", "salary": 130000,
        }, headers=auth_header(hr_token))
        oid = create.json()["id"]
        res = client.post(f"/api/recruitment/offers/{oid}/send", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "sent"


class TestPipeline:
    def test_pipeline_stats(self, client, hr_token):
        res = client.get("/api/recruitment/pipeline/1", headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 2
