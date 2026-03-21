"""Unit tests for approval_service.py - workflow resolution and approver logic."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from unittest.mock import MagicMock, patch
from app.services.approval_service import resolve_workflow, resolve_approver_for_step


def make_mock_employee(department_id=1, band="IC2", manager_id=10, location_id=1):
    emp = MagicMock()
    emp.id = 5
    emp.department_id = department_id
    emp.band = band
    emp.manager_id = manager_id
    emp.location_id = location_id
    return emp


class TestResolveWorkflow:
    def test_exact_match_dept_type_band(self):
        db = MagicMock()
        wf = MagicMock(name="Exact")
        emp = make_mock_employee(department_id=1, band="IC2")

        # First query (dept + type + band) returns workflow
        db.query().filter().first.return_value = wf

        result = resolve_workflow(db, emp, leave_type_id=1)
        assert result == wf

    def test_fallback_to_default(self):
        db = MagicMock()
        default_wf = MagicMock(name="Default")
        emp = make_mock_employee(department_id=None, band=None)

        # No department, so skips first 3 checks, goes to default
        db.query().filter().first.return_value = default_wf

        result = resolve_workflow(db, emp, leave_type_id=1)
        assert result == default_wf

    def test_no_workflow_found(self):
        db = MagicMock()
        emp = make_mock_employee(department_id=None, band=None)
        db.query().filter().first.return_value = None

        result = resolve_workflow(db, emp, leave_type_id=1)
        assert result is None


class TestResolveApproverForStep:
    def test_specific_approver(self):
        db = MagicMock()
        emp = make_mock_employee()
        step = MagicMock()
        step.approver_role = "specific"
        step.specific_approver_id = 99

        result = resolve_approver_for_step(db, emp, step)
        assert result == 99

    def test_manager_with_assigned_approver(self):
        db = MagicMock()
        emp = make_mock_employee(manager_id=10)
        step = MagicMock()
        step.approver_role = "manager"

        assigned = MagicMock()
        assigned.approver_id = 20
        db.query().filter().order_by().first.return_value = assigned

        result = resolve_approver_for_step(db, emp, step)
        assert result == 20

    def test_manager_falls_back_to_manager_id(self):
        db = MagicMock()
        emp = make_mock_employee(manager_id=10)
        step = MagicMock()
        step.approver_role = "manager"
        db.query().filter().order_by().first.return_value = None

        result = resolve_approver_for_step(db, emp, step)
        assert result == 10

    def test_department_head(self):
        db = MagicMock()
        emp = make_mock_employee(department_id=1)
        step = MagicMock()
        step.approver_role = "department_head"

        dept = MagicMock()
        dept.head_id = 50
        db.query().filter().first.return_value = dept

        result = resolve_approver_for_step(db, emp, step)
        assert result == 50

    def test_department_head_no_head_falls_back_to_manager(self):
        db = MagicMock()
        emp = make_mock_employee(department_id=1, manager_id=10)
        step = MagicMock()
        step.approver_role = "department_head"

        dept = MagicMock()
        dept.head_id = None
        db.query().filter().first.return_value = dept

        result = resolve_approver_for_step(db, emp, step)
        assert result == 10

    def test_hr_admin_role(self):
        db = MagicMock()
        emp = make_mock_employee()
        step = MagicMock()
        step.approver_role = "hr_admin"

        hr_user = MagicMock()
        hr_user.employee = MagicMock(id=30)
        db.query().filter().first.return_value = hr_user

        result = resolve_approver_for_step(db, emp, step)
        assert result == 30

    def test_unknown_role_returns_none(self):
        db = MagicMock()
        emp = make_mock_employee()
        step = MagicMock()
        step.approver_role = "unknown_role"
        step.specific_approver_id = None

        result = resolve_approver_for_step(db, emp, step)
        assert result is None
