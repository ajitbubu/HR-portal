from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    link: str | None = None,
):
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
    )
    db.add(notif)
    db.commit()
    return notif


def notify_all_active_users(
    db: Session,
    title: str,
    message: str,
    type: str = "info",
    link: str | None = None,
    exclude_user_id: int | None = None,
):
    """Send a notification to all active users (e.g., for announcements)."""
    users = db.query(User).filter(User.is_active == True).all()
    for user in users:
        if exclude_user_id and user.id == exclude_user_id:
            continue
        notif = Notification(
            user_id=user.id,
            title=title,
            message=message,
            type=type,
            link=link,
        )
        db.add(notif)
    db.commit()


def notify_hr_admins(
    db: Session,
    title: str,
    message: str,
    type: str = "info",
    link: str | None = None,
):
    """Send a notification to all HR admins and super admins."""
    hr_users = db.query(User).filter(
        User.is_active == True,
        User.role.in_(["super_admin", "hr_admin"]),
    ).all()
    for user in hr_users:
        notif = Notification(
            user_id=user.id,
            title=title,
            message=message,
            type=type,
            link=link,
        )
        db.add(notif)
    db.commit()


def notify_leave_chain(db: Session, leave_request, employee):
    """Notify L1 manager, L2 manager, and all HR admins when leave is applied."""
    from app.models.leave import LeaveType
    lt = db.query(LeaveType).filter(LeaveType.id == leave_request.leave_type_id).first()
    leave_type_name = lt.name if lt else "Leave"
    msg = (
        f"{employee.first_name} {employee.last_name} has applied for "
        f"{leave_type_name} from {leave_request.start_date} to {leave_request.end_date} "
        f"({leave_request.total_days} day(s))."
    )
    notified_user_ids: set[int] = set()

    # Level 1 manager
    if employee.manager_id:
        from app.models.user import Employee as Emp
        mgr1 = db.query(Emp).filter(Emp.id == employee.manager_id).first()
        if mgr1 and mgr1.user_id and mgr1.user_id not in notified_user_ids:
            create_notification(db, mgr1.user_id, "New Leave Request", msg, type="approval", link="/approvals")
            notified_user_ids.add(mgr1.user_id)
        # Level 2 manager
        if mgr1 and mgr1.manager_id:
            mgr2 = db.query(Emp).filter(Emp.id == mgr1.manager_id).first()
            if mgr2 and mgr2.user_id and mgr2.user_id not in notified_user_ids:
                create_notification(db, mgr2.user_id, "New Leave Request (FYI)", msg, type="approval", link="/approvals")
                notified_user_ids.add(mgr2.user_id)

    # HR admins and super admins
    hr_users = db.query(User).filter(
        User.is_active == True,
        User.role.in_(["super_admin", "hr_admin"]),
    ).all()
    for hr_user in hr_users:
        if hr_user.id not in notified_user_ids:
            create_notification(db, hr_user.id, "Leave Request Submitted", msg, type="leave", link="/approvals")
            notified_user_ids.add(hr_user.id)


def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).count()
