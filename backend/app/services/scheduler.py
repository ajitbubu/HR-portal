"""Background scheduler for automated HR tasks.

Jobs:
  - check_pending_approval_reminders  — daily 09:00, reminders at 1/3/7 day thresholds
  - run_monthly_accrual               — 1st of every month 00:00, EL +1/month (India), PTO +1.25/month (US)
  - grant_birthday_anniversary_leave  — daily 00:01, auto-approved special leave
  - run_year_end_carry_forward        — Jan 1 00:05, carry unused EL/PTO into new year
  - run_carry_forward_expiry          — Apr 1 00:10, zero out expired carry-forward
"""

import logging
from datetime import date, datetime, timedelta, timezone

from app.core.database import SessionLocal
from app.models.leave import LeaveApproval, LeaveRequest, LeaveType, LeaveBalance, LeavePolicy
from app.models.user import Employee
from app.services.notification_service import create_notification

logger = logging.getLogger(__name__)

REMINDER_THRESHOLDS = {1, 3, 7}


def _to_date(val):
    """Normalise datetime / date / None to date."""
    if val is None:
        return None
    if hasattr(val, "date"):
        return val.date()
    return val


def _is_us_employee(emp) -> bool:
    if emp.location and emp.location.country:
        return emp.location.country.strip().upper() in {"US", "USA", "UNITED STATES"}
    return False


# ── 1. Approval reminders ────────────────────────────────────────────────────

def check_pending_approval_reminders():
    """Send in-app reminders for leave requests pending beyond 1, 3, or 7 days."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending_approvals = db.query(LeaveApproval).filter(
            LeaveApproval.status == "pending",
        ).all()

        approver_requests: dict[int, list] = {}
        for approval in pending_approvals:
            lr = db.query(LeaveRequest).filter(
                LeaveRequest.id == approval.leave_request_id,
            ).first()
            if not lr or lr.status != "pending":
                continue
            created = approval.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            days_pending = (now - created).days
            if days_pending not in REMINDER_THRESHOLDS:
                continue
            emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
            lt = db.query(LeaveType).filter(LeaveType.id == lr.leave_type_id).first()
            approver_requests.setdefault(approval.approver_id, []).append({
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "leave_type": lt.name if lt else "Leave",
                "dates": f"{lr.start_date} to {lr.end_date}",
                "days_pending": days_pending,
            })

        notified = 0
        for approver_id, requests in approver_requests.items():
            approver = db.query(Employee).filter(Employee.id == approver_id).first()
            if not approver or not approver.user_id:
                continue
            create_notification(
                db, approver.user_id,
                f"Reminder: {len(requests)} pending leave request(s)",
                f"You have {len(requests)} leave request(s) awaiting your action.",
                type="approval",
                link="/approvals",
            )
            notified += 1

        logger.info(f"Sent pending-approval reminders to {notified} approvers")
    except Exception as exc:
        logger.error(f"Reminder check failed: {exc}", exc_info=True)
    finally:
        db.close()


# ── 2. Monthly leave accrual ─────────────────────────────────────────────────

def run_monthly_accrual():
    """Credit monthly leave for every active employee.

    India employees: EL  +1.0  day/month  (capped at policy.max_balance or leave_type.default_days)
    US    employees: PTO +1.25 days/month  (capped at policy.max_balance or leave_type.default_days)

    Pro-rates for employees who joined mid-month this month.
    """
    db = SessionLocal()
    try:
        today = date.today()
        current_year = today.year
        accrued_count = 0

        # (code, default_monthly_amount, us_only)
        accrual_targets = [
            ("EL",  1.0,   False),
            ("PTO", 1.25,  True),
        ]

        employees = db.query(Employee).filter(Employee.status == "active").all()

        for code, default_amount, us_only in accrual_targets:
            lt = db.query(LeaveType).filter(
                LeaveType.code == code, LeaveType.is_active == True,
            ).first()
            if not lt:
                continue

            policy = db.query(LeavePolicy).filter(
                LeavePolicy.leave_type_id == lt.id,
                LeavePolicy.is_active == True,
                LeavePolicy.accrual_type == "monthly",
            ).first()
            accrual_amount = (
                policy.accrual_amount if (policy and policy.accrual_amount) else default_amount
            )
            max_cap = (
                policy.max_balance if (policy and policy.max_balance) else lt.default_days
            ) or lt.default_days

            for emp in employees:
                is_us = _is_us_employee(emp)
                if us_only and not is_us:
                    continue
                if not us_only and is_us:
                    continue

                joining = _to_date(emp.joining_date)
                if not joining or joining > today:
                    continue

                # Pro-rate for mid-month joiners
                amount = accrual_amount
                if joining.year == today.year and joining.month == today.month:
                    # days remaining in month from joining day
                    if today.month == 12:
                        days_in_month = 31
                    else:
                        days_in_month = (date(today.year, today.month + 1, 1) - timedelta(days=1)).day
                    days_worked = days_in_month - joining.day + 1
                    amount = round(accrual_amount * (days_worked / days_in_month), 2)

                balance = db.query(LeaveBalance).filter(
                    LeaveBalance.employee_id == emp.id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.year == current_year,
                ).first()

                if balance:
                    new_entitled = min(balance.entitled + amount, max_cap)
                    if new_entitled > balance.entitled:
                        balance.entitled = new_entitled
                        accrued_count += 1
                else:
                    db.add(LeaveBalance(
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        year=current_year,
                        entitled=min(amount, max_cap),
                        used=0, pending=0, carried_forward=0, adjusted=0,
                    ))
                    accrued_count += 1

        db.commit()
        logger.info(f"Monthly accrual: credited leave to {accrued_count} employee-balance pairs")
    except Exception as exc:
        logger.error(f"Monthly accrual failed: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# ── 3. Year-end carry-forward (Jan 1) ────────────────────────────────────────

def run_year_end_carry_forward():
    """On Jan 1: carry unused EL / PTO from previous year into the new year."""
    db = SessionLocal()
    try:
        current_year = date.today().year
        previous_year = current_year - 1
        processed = 0

        for code in ("EL", "PTO"):
            lt = db.query(LeaveType).filter(
                LeaveType.code == code,
                LeaveType.is_active == True,
                LeaveType.carry_forward == True,
            ).first()
            if not lt:
                continue

            max_cf = lt.max_carry_forward_days or 5

            prev_balances = db.query(LeaveBalance).filter(
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == previous_year,
            ).all()

            for bal in prev_balances:
                emp = db.query(Employee).filter(
                    Employee.id == bal.employee_id,
                    Employee.status == "active",
                ).first()
                if not emp:
                    continue

                unused = max(
                    bal.entitled + bal.carried_forward + bal.adjusted - bal.used - bal.pending,
                    0,
                )
                carry = min(unused, max_cf)
                forfeited = max(unused - carry, 0)

                new_bal = db.query(LeaveBalance).filter(
                    LeaveBalance.employee_id == emp.id,
                    LeaveBalance.leave_type_id == lt.id,
                    LeaveBalance.year == current_year,
                ).first()

                if new_bal:
                    new_bal.carried_forward = carry
                else:
                    db.add(LeaveBalance(
                        employee_id=emp.id,
                        leave_type_id=lt.id,
                        year=current_year,
                        entitled=0, used=0, pending=0,
                        carried_forward=carry, adjusted=0,
                    ))

                if emp.user_id and (carry > 0 or forfeited > 0):
                    parts = []
                    if carry > 0:
                        parts.append(f"{carry} day(s) carried forward")
                    if forfeited > 0:
                        parts.append(f"{forfeited} day(s) forfeited")
                    create_notification(
                        db, emp.user_id,
                        f"Year-End {lt.name} Carry Forward",
                        f"Your {lt.name} balance from {previous_year}: {' and '.join(parts)}. "
                        f"Carried-forward days expire on March 31, {current_year}.",
                        type="leave",
                        link="/leave",
                    )
                processed += 1

        db.commit()
        logger.info(f"Year-end carry-forward: processed {processed} employee-balance pair(s)")
    except Exception as exc:
        logger.error(f"Year-end carry-forward failed: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# ── 4. Carry-forward expiry (Apr 1) ──────────────────────────────────────────

def run_carry_forward_expiry():
    """On April 1: zero out carried-forward EL and PTO (expired March 31)."""
    db = SessionLocal()
    try:
        current_year = date.today().year
        expired_count = 0

        for code in ("EL", "PTO"):
            lt = db.query(LeaveType).filter(
                LeaveType.code == code, LeaveType.is_active == True,
            ).first()
            if not lt:
                continue

            balances = db.query(LeaveBalance).filter(
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == current_year,
                LeaveBalance.carried_forward > 0,
            ).all()

            for bal in balances:
                expired_days = bal.carried_forward
                bal.carried_forward = 0
                emp = db.query(Employee).filter(Employee.id == bal.employee_id).first()
                if emp and emp.user_id and expired_days > 0:
                    create_notification(
                        db, emp.user_id,
                        f"Carried-Forward {lt.name} Expired",
                        f"Your {expired_days} carried-forward {lt.name} day(s) from the previous year "
                        f"have expired as of March 31.",
                        type="leave",
                        link="/leave",
                    )
                expired_count += 1

        db.commit()
        logger.info(f"Carry-forward expiry: zeroed CF for {expired_count} balance(s)")
    except Exception as exc:
        logger.error(f"Carry-forward expiry failed: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# ── 5. Birthday & work-anniversary complimentary leave ───────────────────────

def grant_birthday_anniversary_leave():
    """Daily: auto-grant a pre-approved complimentary day off on birthdays and work anniversaries.

    Uses leave type code "COMP" first, falls back to "CO".
    Idempotent — skips employees already granted today.
    """
    db = SessionLocal()
    try:
        today = date.today()

        special_lt = (
            db.query(LeaveType).filter(
                LeaveType.code == "COMP", LeaveType.is_active == True,
            ).first()
            or db.query(LeaveType).filter(
                LeaveType.code == "CO", LeaveType.is_active == True,
            ).first()
        )
        if not special_lt:
            logger.warning("No COMP or CO leave type — birthday/anniversary grants skipped")
            return

        employees = db.query(Employee).filter(Employee.status == "active").all()
        granted = 0

        for emp in employees:
            event_label = None

            dob = _to_date(emp.date_of_birth)
            if dob and dob.month == today.month and dob.day == today.day:
                event_label = "Birthday"

            jd = _to_date(emp.joining_date)
            if (
                jd
                and jd.month == today.month
                and jd.day == today.day
                and jd.year < today.year
            ):
                years = today.year - jd.year
                event_label = f"Work Anniversary ({years} Year{'s' if years > 1 else ''})"

            if not event_label:
                continue

            already = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id == emp.id,
                LeaveRequest.start_date == today,
                LeaveRequest.leave_type_id == special_lt.id,
                LeaveRequest.status == "approved",
            ).first()
            if already:
                continue

            lr = LeaveRequest(
                employee_id=emp.id,
                leave_type_id=special_lt.id,
                start_date=today,
                end_date=today,
                total_days=1,
                is_half_day=False,
                reason=f"Auto-granted: {event_label}",
                status="approved",
                current_approval_step=0,
            )
            db.add(lr)
            db.flush()

            if emp.user_id:
                create_notification(
                    db, emp.user_id,
                    f"Happy {event_label.split(' (')[0]}!",
                    f"You have been granted a complimentary day off today for your {event_label}. Enjoy!",
                    type="leave",
                    link="/leave",
                )
            granted += 1

        db.commit()
        logger.info(f"Birthday/Anniversary leave: granted to {granted} employee(s) on {today}")
    except Exception as exc:
        logger.error(f"Birthday/Anniversary grant failed: {exc}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# ── Scheduler setup ───────────────────────────────────────────────────────────

def setup_scheduler(app):
    """Register all background jobs with APScheduler and start on app startup."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler

        scheduler = BackgroundScheduler(timezone="UTC")

        scheduler.add_job(
            check_pending_approval_reminders, "cron",
            hour=9, minute=0,
            id="approval_reminders", replace_existing=True,
        )
        scheduler.add_job(
            run_monthly_accrual, "cron",
            day=1, hour=0, minute=0,
            id="monthly_accrual", replace_existing=True,
        )
        scheduler.add_job(
            grant_birthday_anniversary_leave, "cron",
            hour=0, minute=1,
            id="birthday_anniversary", replace_existing=True,
        )
        scheduler.add_job(
            run_year_end_carry_forward, "cron",
            month=1, day=1, hour=0, minute=5,
            id="year_end_carryforward", replace_existing=True,
        )
        scheduler.add_job(
            run_carry_forward_expiry, "cron",
            month=4, day=1, hour=0, minute=10,
            id="carryforward_expiry", replace_existing=True,
        )

        scheduler.start()
        logger.info(
            "Background scheduler started — jobs: monthly_accrual, year_end_carryforward, "
            "carryforward_expiry, birthday_anniversary, approval_reminders"
        )

        @app.on_event("shutdown")
        def _shutdown_scheduler():
            scheduler.shutdown(wait=False)
            logger.info("Background scheduler stopped")

    except ImportError:
        logger.warning("APScheduler not installed — background jobs disabled")
    except Exception as exc:
        logger.warning(f"Scheduler setup failed: {exc}", exc_info=True)
