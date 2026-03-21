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


def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).count()
