"""E2E tests for Expense Management."""
from tests.conftest import auth_header


class TestCategories:
    def test_create_category(self, client, hr_token):
        res = client.post("/api/expenses/categories", json={
            "name": "Equipment", "code": "EQP",
            "description": "Equipment purchases", "max_amount": 2000,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["name"] == "Equipment"

    def test_list_categories(self, client, emp_token):
        res = client.get("/api/expenses/categories", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert len(res.json()) >= 3

    def test_update_category(self, client, hr_token):
        res = client.put("/api/expenses/categories/1", json={
            "max_amount": 6000,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["max_amount"] == 6000


class TestClaims:
    def test_create_claim(self, client, emp_token):
        res = client.post("/api/expenses/claims", json={
            "title": "April Expenses", "description": "Various expenses",
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["status"] == "draft"

    def test_my_claims(self, client, emp_token):
        res = client.get("/api/expenses/claims/my", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_get_claim(self, client, emp_token):
        res = client.get("/api/expenses/claims/1", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["title"] == "March Travel"

    def test_add_item(self, client, emp_token):
        # Create a new claim first
        claim = client.post("/api/expenses/claims", json={
            "title": "Test Items Claim",
        }, headers=auth_header(emp_token))
        cid = claim.json()["id"]
        res = client.post(f"/api/expenses/claims/{cid}/items", json={
            "category_id": 1, "amount": 200.00,
            "date": "2026-04-01", "description": "Taxi",
        }, headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["amount"] == 200.0

    def test_update_claim(self, client, emp_token):
        claims = client.get("/api/expenses/claims/my", headers=auth_header(emp_token))
        draft = [c for c in claims.json()["items"] if c["status"] == "draft"]
        if draft:
            cid = draft[0]["id"]
            res = client.put(f"/api/expenses/claims/{cid}", json={
                "title": "Updated Title",
            }, headers=auth_header(emp_token))
            assert res.status_code == 200


class TestClaimSubmission:
    def test_submit_claim(self, client, emp_token):
        # Create claim with item then submit
        claim = client.post("/api/expenses/claims", json={
            "title": "Submit Test",
        }, headers=auth_header(emp_token))
        cid = claim.json()["id"]
        client.post(f"/api/expenses/claims/{cid}/items", json={
            "category_id": 2, "amount": 25.00, "date": "2026-04-01",
            "description": "Lunch meeting",
        }, headers=auth_header(emp_token))
        res = client.post(f"/api/expenses/claims/{cid}/submit", headers=auth_header(emp_token))
        assert res.status_code == 200
        assert res.json()["status"] == "submitted"

    def test_submit_empty_claim_fails(self, client, emp_token):
        claim = client.post("/api/expenses/claims", json={
            "title": "Empty Claim",
        }, headers=auth_header(emp_token))
        cid = claim.json()["id"]
        res = client.post(f"/api/expenses/claims/{cid}/submit", headers=auth_header(emp_token))
        assert res.status_code == 400


class TestClaimApproval:
    def test_pending_approval(self, client, admin_token):
        res = client.get("/api/expenses/claims/pending-approval", headers=auth_header(admin_token))
        assert res.status_code == 200

    def test_approve_and_reimburse(self, client, emp_token, admin_token, hr_token):
        # Create claim with item, submit, approve, reimburse
        claim = client.post("/api/expenses/claims", json={
            "title": "Approval Flow Test",
        }, headers=auth_header(emp_token))
        cid = claim.json()["id"]
        client.post(f"/api/expenses/claims/{cid}/items", json={
            "category_id": 1, "amount": 100.00, "date": "2026-04-02",
            "description": "Test item",
        }, headers=auth_header(emp_token))
        client.post(f"/api/expenses/claims/{cid}/submit", headers=auth_header(emp_token))

        # Approve
        res = client.post(f"/api/expenses/claims/{cid}/action", json={
            "action": "approve",
        }, headers=auth_header(admin_token))
        assert res.status_code == 200
        assert res.json()["status"] == "approved"

        # Reimburse
        res = client.post(f"/api/expenses/claims/{cid}/reimburse", json={
            "amount": 100.00,
        }, headers=auth_header(hr_token))
        assert res.status_code == 200
        assert res.json()["status"] == "reimbursed"


class TestReports:
    def test_expense_summary(self, client, hr_token):
        res = client.get("/api/expenses/reports/summary", headers=auth_header(hr_token))
        assert res.status_code == 200
