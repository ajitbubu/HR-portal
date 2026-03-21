from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.attendance import HolidayCalendar, Holiday
from app.schemas.common import HolidayCalendarCreate, HolidayCalendarResponse, HolidayCreate, HolidayResponse

router = APIRouter(prefix="/holidays", tags=["Holidays"])


@router.get("/calendars", response_model=list[HolidayCalendarResponse])
def list_calendars(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(HolidayCalendar).filter(HolidayCalendar.is_active == True).all()


@router.post("/calendars", response_model=HolidayCalendarResponse)
def create_calendar(req: HolidayCalendarCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    cal = HolidayCalendar(**req.model_dump())
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return cal


@router.post("/", response_model=HolidayResponse)
def add_holiday(req: HolidayCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    h = Holiday(**req.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("super_admin", "hr_admin"))):
    h = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(h)
    db.commit()
    return {"message": "Holiday removed"}
