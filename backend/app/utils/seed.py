"""Seed script to populate the database with demo data."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import date, datetime, timezone
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User, Employee
from app.models.organization import BusinessUnit, Department, Location, Designation, Team
from app.models.leave import LeaveType, LeavePolicy, LeaveRequest, LeaveBalance, LeaveApproval
from app.models.workflow import ApprovalWorkflow, ApprovalWorkflowStep, AssignedApprover
from app.models.salary import SalaryHistory
from app.models.attendance import HolidayCalendar, Holiday
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.misc import Announcement, CompanySetting, OnboardingTask
from app.models.resignation import ResignationRequest, ResignationActionLog


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # ── Users ──
        users_data = [
            ("admin@datasafeguard.us", "admin123", "super_admin"),
            ("hr@datasafeguard.us", "hr123", "hr_admin"),
            ("manager@datasafeguard.us", "manager123", "manager"),
            ("approver@datasafeguard.us", "approver123", "approver"),
            ("employee@datasafeguard.us", "employee123", "employee"),
        ]
        users = []
        for email, pwd, role in users_data:
            u = User(email=email, password_hash=hash_password(pwd), role=role)
            db.add(u)
            users.append(u)
        db.flush()

        # ── Locations ──
        locations = []
        for name, city, state, country in [
            ("Bhubaneswar, IND", "Bhubaneswar", "Odisha", "India"),
            ("Mumbai, IND", "Mumbai", "Maharashtra", "India"),
            ("Pune, IND", "Pune", "Maharashtra", "India"),
            ("Delhi, IND", "Delhi", "Delhi", "India"),
            ("Bangalore, IND", "Bangalore", "Karnataka", "India"),
            ("Hyderabad, IND", "Hyderabad", "Telangana", "India"),
            ("Santa Clara, CA", "Santa Clara", "California", "USA"),
            ("New York City, USA", "New York City", "New York", "USA"),
            ("Other", "Other", None, "Other"),
        ]:
            loc = Location(name=name, city=city, state=state, country=country)
            db.add(loc)
            locations.append(loc)
        db.flush()

        # ── Business Units ──
        bus = []
        for name in ["DataSafeGuard"]:
            bu = BusinessUnit(name=name)
            db.add(bu)
            bus.append(bu)
        db.flush()

        # ── Designations ──
        designations = []
        for title, level in [
            ("CEO / Managing Director", 1),   # 0
            ("Director", 2),                   # 1
            ("Sr. Director", 2),               # 2
            ("Engineering Manager", 3),        # 3
            ("Senior Software Engineer", 4),   # 4
            ("Software Engineer", 5),          # 5
            ("HR Executive", 4),               # 6
            ("Privacy Expert", 4),             # 7
            ("HR Manager", 3),                 # 8
            ("Finance Manager", 3),            # 9
            ("Operations Manager", 3),         # 10
            ("Intern", 7),                     # 11
            ("Contractor", 5),                 # 12
        ]:
            d = Designation(title=title, level=level)
            db.add(d)
            designations.append(d)
        db.flush()

        # ── Departments ──
        depts = []
        for name in ["Engineering", "Product", "Sales", "Marketing", "Human Resources",
                     "Finance", "Operations", "Legal & Compliance", "Customer Success", "Executive"]:
            d = Department(name=name, business_unit_id=bus[0].id)
            db.add(d)
            depts.append(d)
        db.flush()
        # dept index: Engineering=0, Executive=9, HR=4

        # ── Employees (actual DataSafeGuard team) ──
        # Format: (emp_id, first, last, email, role, desig_idx, dept_idx, loc_idx, mgr_emp_idx, joining_date)
        # loc: 0=Bhubaneswar,IND  1=Mumbai,IND  2=Pune,IND  3=Delhi,IND
        #      4=Bangalore,IND    5=Hyderabad,IND  6=SantaClara,CA  7=NewYorkCity,USA  8=Other
        emp_data = [
            # idx  emp_id      first           last                email                            role          desig loc dept mgr  joining
            (0,  "DS00001", "Sudhir",          "Sahu",              "sudhir@datasafeguard.ai",       "super_admin", 0,   9,   6,  None, date(2020, 1, 1)),
            (1,  "DS00002", "Lee",             "Nocon",             "lnocon@datasafeguard.ai",       "manager",     1,   9,   6,  0,    date(2020, 6, 1)),
            (2,  "DS00003", "Mahi",            "Gupta",             "mgupta@datasafeguard.ai",       "employee",    1,   9,   6,  0,    date(2021, 1, 1)),
            (3,  "DS00004", "Pranab",          "Mohanty",           "pmohanty@datasafeguard.ai",     "employee",    1,   9,   6,  0,    date(2021, 3, 1)),
            (4,  "DS00005", "Tedra",           "Chen",              "tchen@datasafeguard.ai",        "employee",    1,   9,   6,  0,    date(2021, 5, 1)),
            (5,  "DS00006", "Tirthankar",      "Mitra",             "tmitra@datasafeguard.ai",       "employee",    1,   9,   6,  0,    date(2021, 7, 1)),
            (6,  "DS00007", "Ajit",            "Sahu",              "asahu@datasafeguard.ai",        "manager",     3,   0,   0,  1,    date(2021, 9, 1)),
            (7,  "DS00008", "Sumeet",          "Shah",              "sshah@datasafeguard.ai",        "manager",     3,   0,   0,  1,    date(2021, 11, 1)),
            (8,  "DS00009", "Ashis",           "Rout",              "arout@datasafeguard.ai",        "manager",     3,   0,   0,  1,    date(2022, 1, 1)),
            (9,  "DS00010", "Santosh",         "Das",               "sdas@datasafeguard.ai",         "manager",     3,   0,   0,  6,    date(2022, 3, 1)),
            (10, "DS00011", "Harsh",           "Nagar",             "hnagar@datasafeguard.ai",       "employee",    5,   0,   0,  6,    date(2022, 5, 1)),
            (11, "DS00012", "Abhisek",         "Khuntia",           "akhuntia@datasafeguard.ai",     "employee",    5,   0,   0,  6,    date(2022, 7, 1)),
            (12, "DS00013", "Sourav",          "Mohapatra",         "smohapatra@datasafeguard.ai",   "employee",    5,   0,   0,  6,    date(2022, 9, 1)),
            (13, "DS00014", "Soumya",          "Sootar",            "ssootar@datasafeguard.ai",      "employee",    5,   0,   0,  6,    date(2022, 11, 1)),
            (14, "DS00016", "Subash",          "Goswami",           "sgoswami@datasafeguard.ai",     "employee",    5,   0,   0,  6,    date(2023, 1, 1)),
            (15, "DS00017", "Dr. Anita",       "Mishra",            "amishra@datasafeguard.ai",      "employee",    4,   0,   0,  9,    date(2023, 3, 1)),
            (16, "DS00018", "Bibhu",           "Behera",            "bbehera@datasafeguard.ai",      "employee",    5,   0,   0,  9,    date(2023, 5, 1)),
            (17, "DS00019", "Pradeepta Kumar", "Behera",            "pbehera@datasafeguard.ai",      "employee",    5,   0,   0,  9,    date(2023, 7, 1)),
            (18, "DS00020", "Ankita",          "Choudhury",         "achoudhury@datasafeguard.ai",   "employee",    5,   0,   0,  7,    date(2023, 9, 1)),
            (19, "DS00021", "Peeyush",         "Tambe",             "ptambe@datasafeguard.ai",       "employee",    5,   0,   0,  7,    date(2023, 11, 1)),
            (20, "DS00022", "Prabhjyot",       "Sodhi",             "psodhi@datasafeguard.ai",       "employee",    5,   0,   0,  7,    date(2024, 1, 1)),
            (21, "DS00023", "Tanmay",          "Arya",              "tarya@datasafeguard.ai",        "employee",    5,   0,   0,  7,    date(2024, 3, 1)),
            (22, "DS00024", "Priyanka",        "Parab",             "pparab@datasafeguard.ai",       "employee",    5,   0,   0,  7,    date(2024, 5, 1)),
            (23, "DS00025", "Sainaya",         "Brid",              "sbrid@datasafeguard.ai",        "employee",    5,   0,   0,  7,    date(2024, 7, 1)),
            (24, "DS00026", "Trupti",          "Kokare",            "tkokare@datasafeguard.ai",      "employee",    5,   0,   0,  7,    date(2024, 9, 1)),
            (25, "DS00027", "Nishant",         "Selote",            "nselote@datasafeguard.ai",      "employee",    5,   0,   0,  7,    date(2024, 11, 1)),
            (26, "DS00028", "Yogesh",          "Kawtikwar",         "ykawtikwar@datasafeguard.ai",   "employee",    5,   0,   0,  7,    date(2025, 1, 1)),
            (27, "DS00029", "Sudesna",         "Mishra",            "smishra@datasafeguard.ai",      "manager",     3,   0,   0,  8,    date(2025, 3, 1)),
            (28, "DS00030", "Debjani",         "Mohanty",           "dmohanty@datasafeguard.ai",     "hr_admin",    6,   4,   0,  8,    date(2025, 5, 1)),
            (29, "DS00031", "Rasmita",         "Swain",             "rswain@datasafeguard.ai",       "employee",    5,   0,   0,  27,   date(2025, 7, 1)),
            (30, "DS00032", "Mousumi",         "Bhattacharya Dash", "sbh@datasafeguard.ai", "employee", 7, 0,   0,  2,    date(2025, 9, 1)),
            (31, "DS00033", "Shubham",         "Pattanayak",        "spattanayak@datasafeguard.ai",  "employee",    5,   0,   0,  0,    date(2025, 11, 1)),
            (32, "DS00034", "Swarnam",         "Dash",              "sdash@datasafeguard.ai",        "employee",    5,   0,   0,  0,    date(2026, 1, 1)),
            (33, "DS00035", "Ritu",            "Mehta",             "rmehta@datasafeguard.ai",       "employee",    5,   0,   0,  5,    date(2026, 3, 1)),
        ]

        employees = []
        for (_, emp_id, first, last, email, role, desig_idx, dept_idx, loc_idx, mgr_idx, jdate) in emp_data:
            u = User(email=email, password_hash=hash_password("Admin@123"), role=role, is_active=True)
            db.add(u)
            db.flush()
            emp = Employee(
                user_id=u.id,
                employee_id=emp_id,
                first_name=first,
                last_name=last,
                email=email,
                designation_id=designations[desig_idx].id,
                department_id=depts[dept_idx].id,
                location_id=locations[loc_idx].id,
                employment_type="full_time",
                joining_date=jdate,
                status="active",
            )
            db.add(emp)
            employees.append(emp)
        db.flush()

        # Set manager relationships
        for i, (_, _, _, _, _, _, _, _, _, mgr_idx, _) in enumerate(emp_data):
            if mgr_idx is not None:
                employees[i].manager_id = employees[mgr_idx].id
        db.flush()

        # ── Leave Types ──
        leave_types = []
        lt_data = [
            ("Annual Leave", "AL", 20, True, True, 5, False),
            ("Sick Leave", "SL", 12, True, False, 0, True),
            ("Casual Leave", "CL", 7, True, False, 0, False),
            ("Unpaid Leave", "UL", 0, False, False, 0, False),
            ("Maternity Leave", "ML", 90, True, False, 0, True),
            ("Paternity Leave", "PL", 15, True, False, 0, False),
            ("Comp Off", "CO", 0, True, False, 0, False),
        ]
        for name, code, days, paid, cf, max_cf, req_doc in lt_data:
            lt = LeaveType(name=name, code=code, default_days=days, is_paid=paid,
                           carry_forward=cf, max_carry_forward_days=max_cf, requires_document=req_doc)
            db.add(lt)
            leave_types.append(lt)
        db.flush()

        # ── Leave Policies ──
        for lt in leave_types[:3]:
            pol = LeavePolicy(
                name=f"{lt.name} Policy", leave_type_id=lt.id,
                accrual_type="annual", exclude_weekends=True, exclude_holidays=True,
                allow_half_day=True, allow_negative_balance=False,
            )
            db.add(pol)
        db.flush()

        # ── Leave Balances for all active employees ──
        for emp in employees:
            for lt in leave_types:
                if lt.default_days > 0:
                    bal = LeaveBalance(
                        employee_id=emp.id, leave_type_id=lt.id, year=2026,
                        entitled=lt.default_days, used=0, pending=0,
                        carried_forward=2 if lt.carry_forward else 0, adjusted=0,
                    )
                    db.add(bal)
        db.flush()

        # ── Approval Workflows ──
        # Default: single-step manager approval
        wf1 = ApprovalWorkflow(name="Default - Manager Approval", is_default=True, is_active=True)
        db.add(wf1)
        db.flush()
        db.add(ApprovalWorkflowStep(workflow_id=wf1.id, step_order=1, approver_role="manager"))

        # Engineering 2-step
        wf2 = ApprovalWorkflow(name="Engineering - Two Level", department_id=depts[0].id, is_active=True)
        db.add(wf2)
        db.flush()
        db.add(ApprovalWorkflowStep(workflow_id=wf2.id, step_order=1, approver_role="manager"))
        db.add(ApprovalWorkflowStep(workflow_id=wf2.id, step_order=2, approver_role="department_head"))

        # 3-step for long leaves
        wf3 = ApprovalWorkflow(name="Long Leave - Three Level", leave_type_id=leave_types[4].id, is_active=True)
        db.add(wf3)
        db.flush()
        db.add(ApprovalWorkflowStep(workflow_id=wf3.id, step_order=1, approver_role="manager"))
        db.add(ApprovalWorkflowStep(workflow_id=wf3.id, step_order=2, approver_role="department_head"))
        db.add(ApprovalWorkflowStep(workflow_id=wf3.id, step_order=3, approver_role="hr_admin"))
        db.flush()

        # ── Sample Leave Requests ──
        lr1 = LeaveRequest(
            employee_id=employees[8].id, leave_type_id=leave_types[0].id,
            start_date=date(2026, 4, 7), end_date=date(2026, 4, 11),
            total_days=5, reason="Family vacation", status="pending", current_approval_step=1,
        )
        db.add(lr1)
        db.flush()
        db.add(LeaveApproval(leave_request_id=lr1.id, approver_id=employees[6].id, step_order=1, status="pending"))

        lr2 = LeaveRequest(
            employee_id=employees[10].id, leave_type_id=leave_types[1].id,
            start_date=date(2026, 3, 20), end_date=date(2026, 3, 21),
            total_days=2, reason="Not feeling well", status="approved",
        )
        db.add(lr2)
        db.flush()
        db.add(LeaveApproval(
            leave_request_id=lr2.id, approver_id=employees[6].id, step_order=1,
            status="approved", comments="Get well soon!", acted_at=datetime(2026, 3, 19, 10, 0, tzinfo=timezone.utc),
        ))

        # Update balances for approved leave
        bal = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == employees[10].id,
            LeaveBalance.leave_type_id == leave_types[1].id,
            LeaveBalance.year == 2026,
        ).first()
        if bal:
            bal.used = 2

        # Pending balance for lr1
        bal2 = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == employees[8].id,
            LeaveBalance.leave_type_id == leave_types[0].id,
            LeaveBalance.year == 2026,
        ).first()
        if bal2:
            bal2.pending = 5

        db.flush()

        # ── Salary History ──
        for emp in employees[:10]:
            records = [
                (date(2023, 1, 1), 75000, 5000, 3000, 500, "Initial offer"),
                (date(2024, 4, 1), 82000, 7000, 3500, 500, "Annual review"),
                (date(2025, 4, 1), 90000, 10000, 4000, 500, "Promotion"),
            ]
            for eff_date, base, bonus, allow, ded, reason in records:
                db.add(SalaryHistory(
                    employee_id=emp.id, effective_date=eff_date,
                    base_pay=base + (emp.id * 1000), bonus=bonus,
                    allowance=allow, deduction=ded,
                    total=base + (emp.id * 1000) + bonus + allow - ded,
                    reason=reason, changed_by_id=employees[2].id,
                ))

        # ── Holiday Calendar ──
        cal = HolidayCalendar(name="US Holidays 2026", year=2026, location_id=locations[0].id)
        db.add(cal)
        db.flush()
        us_holidays = [
            ("New Year's Day", date(2026, 1, 1)),
            ("Martin Luther King Jr. Day", date(2026, 1, 19)),
            ("Presidents' Day", date(2026, 2, 16)),
            ("Memorial Day", date(2026, 5, 25)),
            ("Independence Day", date(2026, 7, 3)),
            ("Labor Day", date(2026, 9, 7)),
            ("Thanksgiving", date(2026, 11, 26)),
            ("Day after Thanksgiving", date(2026, 11, 27)),
            ("Christmas Eve", date(2026, 12, 24)),
            ("Christmas Day", date(2026, 12, 25)),
            ("New Year's Eve", date(2026, 12, 31)),
        ]
        for hname, hdate in us_holidays:
            db.add(Holiday(calendar_id=cal.id, name=hname, date=hdate, is_optional=False))

        # India calendar
        cal_in = HolidayCalendar(name="India Holidays 2026", year=2026, location_id=locations[3].id)
        db.add(cal_in)
        db.flush()
        for hname, hdate, opt in [
            ("Republic Day", date(2026, 1, 26), False),
            ("Holi", date(2026, 3, 17), False),
            ("Good Friday", date(2026, 4, 3), True),
            ("Independence Day", date(2026, 8, 15), False),
            ("Gandhi Jayanti", date(2026, 10, 2), False),
            ("Diwali", date(2026, 11, 8), False),
            ("Christmas", date(2026, 12, 25), False),
        ]:
            db.add(Holiday(calendar_id=cal_in.id, name=hname, date=hdate, is_optional=opt))

        # ── Announcements ──
        announcements = [
            ("Welcome to DataSafeguard HR Platform", "We are excited to launch our new HR management system. All employees can now manage their leave, attendance, and profile through this portal.", "high"),
            ("Q1 2026 Company All-Hands", "Join us for the quarterly all-hands meeting on April 15th at 2:00 PM EST. We'll be covering company performance, new initiatives, and team updates.", "normal"),
            ("Updated Leave Policy", "Please review the updated leave policy for 2026. Key changes include increased annual leave allowance and new carry-forward rules.", "high"),
            ("Office Renovation Notice", "The 3rd floor of our SF office will be under renovation from May 1-15. Please use the 2nd floor meeting rooms during this period.", "normal"),
        ]
        for title, content, priority in announcements:
            db.add(Announcement(title=title, content=content, author_id=employees[2].id, priority=priority))

        # ── Company Settings ──
        settings = [
            ("company_name", "DataSafeguard Inc.", "general", "Company legal name"),
            ("work_week_start", "monday", "general", "First day of work week"),
            ("work_hours_per_day", "8", "attendance", "Standard working hours per day"),
            ("leave_year_start", "january", "leave", "Leave year start month"),
            ("max_carry_forward_days", "5", "leave", "Maximum days that can be carried forward"),
            ("require_manager_approval", "true", "leave", "Require manager approval for all leave"),
            ("allow_half_day_leave", "true", "leave", "Allow half-day leave requests"),
            ("min_notice_days", "2", "leave", "Minimum notice days for leave application"),
            ("currency", "USD", "payroll", "Default currency for salary"),
        ]
        for key, value, category, desc in settings:
            db.add(CompanySetting(key=key, value=value, category=category, description=desc))

        # ── Assigned Approvers ──
        # Employee 6 (Team Lead) gets manager (emp 4) as primary approver
        db.add(AssignedApprover(employee_id=employees[6].id, approver_id=employees[4].id, approver_type="primary", priority=1))
        # Employee 8 gets team lead (emp 6) as primary
        db.add(AssignedApprover(employee_id=employees[8].id, approver_id=employees[6].id, approver_type="primary", priority=1))
        # Fallback approver for emp 8
        db.add(AssignedApprover(employee_id=employees[8].id, approver_id=employees[4].id, approver_type="fallback", priority=2))

        db.commit()
        print("Database seeded successfully!")
        print(f"  Created {len(employees)} employees")
        print(f"  Created {len(leave_types)} leave types")
        print(f"  Created 3 approval workflows")
        print(f"  Created 2 holiday calendars")
        print(f"  Created {len(announcements)} announcements")
        print("\nDemo credentials:")
        print("  admin@datasafeguard.us / admin123 (Super Admin)")
        print("  hr@datasafeguard.us / hr123 (HR Admin)")
        print("  manager@datasafeguard.us / manager123 (Manager)")
        print("  approver@datasafeguard.us / approver123 (Approver)")
        print("  employee@datasafeguard.us / employee123 (Employee)")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
