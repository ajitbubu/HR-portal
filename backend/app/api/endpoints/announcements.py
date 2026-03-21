from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, Employee
from app.models.misc import Announcement
from app.schemas.common import AnnouncementCreate, AnnouncementResponse
from app.services.notification_service import notify_all_active_users

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    announcements = db.query(Announcement).filter(Announcement.is_active == True).order_by(Announcement.created_at.desc()).limit(20).all()
    results = []
    for a in announcements:
        author = db.query(Employee).filter(Employee.id == a.author_id).first()
        results.append(AnnouncementResponse(
            id=a.id, title=a.title, content=a.content,
            author_name=f"{author.first_name} {author.last_name}" if author else "System",
            priority=a.priority, is_active=a.is_active, created_at=a.created_at,
        ))
    return results


@router.post("", response_model=AnnouncementResponse)
def create_announcement(
    req: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("super_admin", "hr_admin")),
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    ann = Announcement(title=req.title, content=req.content, author_id=emp.id, priority=req.priority)
    db.add(ann)
    db.commit()
    db.refresh(ann)

    # Notify all active users about the new announcement
    priority_label = f" [{req.priority.upper()}]" if req.priority in ("high", "urgent") else ""
    notify_all_active_users(
        db,
        title=f"New Announcement{priority_label}",
        message=f"{req.title}",
        type="announcement",
        link="/announcements",
        exclude_user_id=current_user.id,
    )

    return AnnouncementResponse(
        id=ann.id, title=ann.title, content=ann.content,
        author_name=f"{emp.first_name} {emp.last_name}",
        priority=ann.priority, is_active=ann.is_active, created_at=ann.created_at,
    )


@router.delete("/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    ann.is_active = False
    db.commit()
    return {"message": "Announcement deactivated"}
