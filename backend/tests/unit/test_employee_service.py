"""Unit tests for employee_service.py - ID generation and search."""

import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from unittest.mock import MagicMock
from app.services.employee_service import generate_employee_id


class TestGenerateEmployeeId:
    def test_first_employee(self):
        db = MagicMock()
        db.query().order_by().first.return_value = None
        result = generate_employee_id(db)
        assert result == "DS00001"

    def test_sequential_id(self):
        db = MagicMock()
        last_emp = MagicMock()
        last_emp.id = 10
        db.query().order_by().first.return_value = last_emp
        result = generate_employee_id(db)
        assert result == "DS00011"

    def test_id_format_with_padding(self):
        db = MagicMock()
        last_emp = MagicMock()
        last_emp.id = 99
        db.query().order_by().first.return_value = last_emp
        result = generate_employee_id(db)
        assert result == "DS00100"
        assert len(result) == 7  # DS + 5 digits

    def test_large_id(self):
        db = MagicMock()
        last_emp = MagicMock()
        last_emp.id = 99999
        db.query().order_by().first.return_value = last_emp
        result = generate_employee_id(db)
        assert result == "DS100000"
