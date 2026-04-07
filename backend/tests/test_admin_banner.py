"""Tests for the public GET /admin/banner endpoint."""

import pytest
from app.models.misc import CompanySetting


class TestGetBanner:
    @pytest.fixture(autouse=True)
    def clean_banner_rows(self, db):
        # Ensure clean state before and after each test
        for key in ("banner.enabled", "banner.type", "banner.message"):
            row = db.query(CompanySetting).filter(CompanySetting.key == key).first()
            if row:
                db.delete(row)
        db.commit()
        yield
        for key in ("banner.enabled", "banner.type", "banner.message"):
            row = db.query(CompanySetting).filter(CompanySetting.key == key).first()
            if row:
                db.delete(row)
        db.commit()

    def test_returns_defaults_when_no_settings(self, client):
        """Public endpoint returns safe defaults when no banner.* rows exist."""
        resp = client.get("/api/admin/banner")
        assert resp.status_code == 200
        data = resp.json()
        assert data["enabled"] is False
        assert data["type"] == "info"
        assert data["message"] == ""

    def test_reflects_stored_settings(self, client, db):
        """When banner settings are in DB, the endpoint returns them."""
        for key, value in [
            ("banner.enabled", "true"),
            ("banner.type", "warning"),
            ("banner.message", "Maintenance tonight at 11 PM"),
        ]:
            db.add(CompanySetting(key=key, value=value, category="banner"))
        db.commit()

        resp = client.get("/api/admin/banner")
        assert resp.status_code == 200
        data = resp.json()
        assert data["enabled"] is True
        assert data["type"] == "warning"
        assert data["message"] == "Maintenance tonight at 11 PM"

    def test_no_auth_required(self, client):
        """Banner endpoint must be accessible without a token (login page needs it)."""
        resp = client.get("/api/admin/banner")
        assert resp.status_code == 200  # not 401

    def test_banner_disabled_when_explicitly_false(self, client, db):
        """Explicitly storing 'false' returns enabled=False."""
        db.add(CompanySetting(key="banner.enabled", value="false", category="banner"))
        db.commit()
        resp = client.get("/api/admin/banner")
        assert resp.json()["enabled"] is False
