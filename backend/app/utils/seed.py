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
        for name, city, country in [
            ("HQ - San Francisco", "San Francisco", "USA"),
            ("NYC Office", "New York", "USA"),
            ("London Office", "London", "UK"),
            ("Bangalore Office", "Bangalore", "India"),
            ("Remote", "N/A", "Global"),
        ]:
            loc = Location(name=name, city=city, country=country)
            db.add(loc)
            locations.append(loc)
        db.flush()

        # ── Business Units ──
        bus = []
        for name in ["Technology", "Operations", "Corporate"]:
            bu = BusinessUnit(name=name)
            db.add(bu)
            bus.append(bu)
        db.flush()

        # ── Designations ──
        designations = []
        for title, level, band in [
            ("CEO", 10, "E1"), ("CTO", 9, "E1"), ("VP Engineering", 8, "E2"),
            ("Senior Director", 7, "D1"), ("Director", 6, "D2"),
            ("Senior Manager", 5, "M1"), ("Manager", 4, "M2"),
            ("Team Lead", 3, "IC3"), ("Senior Engineer", 3, "IC3"),
            ("Engineer", 2, "IC2"), ("Associate Engineer", 1, "IC1"),
            ("HR Director", 7, "D1"), ("HR Manager", 5, "M1"),
            ("HR Specialist", 2, "IC2"), ("Intern", 0, "INT"),
        ]:
            d = Designation(title=title, level=level, band=band)
            db.add(d)
            designations.append(d)
        db.flush()

        # ── Departments ──
        depts = []
        dept_data = [
            ("Engineering", "ENG", bus[0].id), ("Product", "PRD", bus[0].id),
            ("Data Science", "DS", bus[0].id), ("Human Resources", "HR", bus[2].id),
            ("Finance", "FIN", bus[2].id), ("Marketing", "MKT", bus[1].id),
            ("Sales", "SLS", bus[1].id), ("Customer Support", "SUP", bus[1].id),
        ]
        for name, code, bu_id in dept_data:
            d = Department(name=name, code=code, business_unit_id=bu_id)
            db.add(d)
            depts.append(d)
        db.flush()

        # ── Employees (50 employees) ──
        emp_data = [
            # (first, last, email_suffix, dept_idx, desig_idx, loc_idx, manager_emp_idx, user_idx, employment_type)
            ("Robert", "Chen", "robert.chen", 0, 0, 0, None, 0, "full_time"),       # 0: CEO
            ("Sarah", "Mitchell", "sarah.mitchell", 0, 1, 0, 0, None, "full_time"),  # 1: CTO
            ("James", "Wilson", "james.wilson", 3, 11, 0, 0, 1, "full_time"),        # 2: HR Director
            ("Emily", "Davis", "emily.davis", 0, 2, 0, 1, None, "full_time"),        # 3: VP Eng
            ("Michael", "Johnson", "michael.johnson", 0, 5, 0, 3, 2, "full_time"),   # 4: Sr Mgr (manager user)
            ("Lisa", "Anderson", "lisa.anderson", 3, 12, 0, 2, 3, "full_time"),      # 5: HR Mgr (approver user)
            ("David", "Thompson", "david.thompson", 0, 7, 0, 4, 4, "full_time"),     # 6: Team Lead (employee user)
            ("Jennifer", "Garcia", "jennifer.garcia", 0, 8, 0, 4, None, "full_time"),
            ("Christopher", "Martinez", "chris.martinez", 0, 9, 1, 6, None, "full_time"),
            ("Amanda", "Robinson", "amanda.robinson", 0, 9, 1, 6, None, "full_time"),
            ("Daniel", "Clark", "daniel.clark", 0, 10, 0, 6, None, "full_time"),     # 10
            ("Jessica", "Lewis", "jessica.lewis", 1, 5, 0, 3, None, "full_time"),
            ("Matthew", "Lee", "matthew.lee", 1, 7, 0, 11, None, "full_time"),
            ("Ashley", "Walker", "ashley.walker", 1, 9, 2, 11, None, "full_time"),
            ("Andrew", "Hall", "andrew.hall", 2, 5, 3, 3, None, "full_time"),
            ("Stephanie", "Allen", "stephanie.allen", 2, 8, 3, 14, None, "full_time"),  # 15
            ("Joshua", "Young", "joshua.young", 2, 9, 3, 14, None, "full_time"),
            ("Nicole", "King", "nicole.king", 3, 13, 0, 5, None, "full_time"),
            ("Ryan", "Wright", "ryan.wright", 4, 5, 0, 0, None, "full_time"),
            ("Megan", "Lopez", "megan.lopez", 4, 9, 0, 18, None, "full_time"),
            ("Brandon", "Hill", "brandon.hill", 5, 5, 1, 0, None, "full_time"),      # 20
            ("Rachel", "Scott", "rachel.scott", 5, 9, 1, 20, None, "full_time"),
            ("Kevin", "Green", "kevin.green", 6, 5, 0, 0, None, "full_time"),
            ("Laura", "Adams", "laura.adams", 6, 9, 0, 22, None, "full_time"),
            ("Jason", "Baker", "jason.baker", 7, 5, 3, 0, None, "full_time"),
            ("Michelle", "Gonzalez", "michelle.gonzalez", 7, 9, 3, 24, None, "full_time"),  # 25
            ("Justin", "Nelson", "justin.nelson", 0, 9, 0, 4, None, "full_time"),
            ("Amber", "Carter", "amber.carter", 0, 9, 2, 4, None, "full_time"),
            ("Tyler", "Mitchell2", "tyler.mitchell", 0, 10, 0, 6, None, "full_time"),
            ("Samantha", "Perez", "samantha.perez", 1, 9, 0, 11, None, "full_time"),
            ("Aaron", "Roberts", "aaron.roberts", 2, 9, 3, 14, None, "full_time"),   # 30
            ("Kayla", "Turner", "kayla.turner", 3, 13, 0, 5, None, "full_time"),
            ("Nathan", "Phillips", "nathan.phillips", 5, 9, 1, 20, None, "full_time"),
            ("Brittany", "Campbell", "brittany.campbell", 6, 9, 0, 22, None, "full_time"),
            ("Jacob", "Parker", "jacob.parker", 7, 9, 3, 24, None, "full_time"),
            ("Christina", "Evans", "christina.evans", 0, 8, 0, 4, None, "full_time"),  # 35
            ("Sean", "Edwards", "sean.edwards", 0, 9, 1, 6, None, "full_time"),
            ("Danielle", "Collins", "danielle.collins", 1, 10, 0, 12, None, "full_time"),
            ("Patrick", "Stewart2", "patrick.stewart", 4, 9, 0, 18, None, "full_time"),
            ("Vanessa", "Sanchez", "vanessa.sanchez", 5, 10, 1, 20, None, "full_time"),
            ("Derek", "Morris", "derek.morris", 0, 9, 0, 4, None, "part_time"),       # 40
            ("Heather", "Rogers", "heather.rogers", 3, 13, 0, 5, None, "part_time"),
            ("Cody", "Reed", "cody.reed", 0, 14, 0, 6, None, "intern"),
            ("Tiffany", "Cook", "tiffany.cook", 1, 14, 0, 12, None, "intern"),
            ("Marcus", "Morgan", "marcus.morgan", 0, 9, 2, 4, None, "contractor"),
            ("Olivia", "Bell", "olivia.bell", 2, 9, 3, 14, None, "contractor"),       # 45
            ("Trevor", "Murphy", "trevor.murphy", 6, 10, 0, 22, None, "full_time"),
            ("Courtney", "Rivera", "courtney.rivera", 7, 10, 3, 24, None, "full_time"),
            ("Kyle", "Cooper", "kyle.cooper", 0, 8, 0, 3, None, "full_time"),
            ("Allison", "Richardson", "allison.richardson", 4, 10, 0, 18, None, "full_time"),
        ]

        employees = []
        for i, (first, last, esuffix, dept_idx, desig_idx, loc_idx, mgr_idx, user_idx, emp_type) in enumerate(emp_data):
            email = f"{esuffix}@datasafeguard.us"
            # Create user if not linked to existing user
            if user_idx is not None:
                uid = users[user_idx].id
            else:
                u = User(email=email, password_hash=hash_password("password123"), role="employee")
                db.add(u)
                db.flush()
                uid = u.id

            emp = Employee(
                user_id=uid,
                employee_id=f"DS{i+1:05d}",
                first_name=first,
                last_name=last,
                email=email,
                phone=f"+1-555-{100+i:04d}",
                department_id=depts[dept_idx].id,
                designation_id=designations[desig_idx].id,
                location_id=locations[loc_idx].id,
                band=designations[desig_idx].band,
                employment_type=emp_type,
                joining_date=date(2020 + (i % 6), (i % 12) + 1, 1),
                status="active",
            )
            db.add(emp)
            employees.append(emp)
        db.flush()

        # Set manager relationships
        for i, (_, _, _, _, _, _, mgr_idx, _, _) in enumerate(emp_data):
            if mgr_idx is not None:
                employees[i].manager_id = employees[mgr_idx].id

        # Set department heads
        depts[0].head_id = employees[3].id  # VP Eng heads Engineering
        depts[3].head_id = employees[2].id  # HR Director heads HR
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
