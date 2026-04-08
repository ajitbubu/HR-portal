from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.get("/by-region", response_model=list[HolidayResponse])
def list_holidays_by_region(
    calendar_id: int,
    region: Optional[str] = Query(None, description="Filter by region: North, South, East, West, All"),
    holiday_type: Optional[str] = Query(None, description="Filter by type: national, regional, restricted"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return holidays for a calendar, optionally filtered by region and/or type."""
    q = db.query(Holiday).filter(Holiday.calendar_id == calendar_id)
    if region:
        q = q.filter((Holiday.region == region) | (Holiday.region == "All"))
    if holiday_type:
        q = q.filter(Holiday.holiday_type == holiday_type)
    return q.order_by(Holiday.date).all()


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
