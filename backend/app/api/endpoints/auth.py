from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User, Employee
from app.schemas.auth import LoginRequest, TokenResponse, RegisterRequest, UserResponse
from app.services.audit_service import log_audit
from app.services.employee_service import generate_employee_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()

    log_audit(db, user.id, "login", "user", user.id)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=user.role,
        employee_id=emp.id if emp else None,
        name=f"{emp.first_name} {emp.last_name}" if emp else user.email,
    )


@router.post("/register", response_model=UserResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=req.email, password_hash=hash_password(req.password), role=req.role)
    db.add(user)
    db.flush()

    emp = Employee(
        user_id=user.id,
        employee_id=generate_employee_id(db),
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        joining_date="2026-01-01",
    )
    db.add(emp)
    db.commit()

    return UserResponse(
        id=user.id, email=user.email, role=user.role,
        is_active=user.is_active, employee_id=emp.id,
        name=f"{emp.first_name} {emp.last_name}",
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    return UserResponse(
        id=current_user.id, email=current_user.email, role=current_user.role,
        is_active=current_user.is_active, employee_id=emp.id if emp else None,
        name=f"{emp.first_name} {emp.last_name}" if emp else current_user.email,
    )
