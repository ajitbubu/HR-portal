from datetime import date, datetime
from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    department_id: int | None = None
    designation_id: int | None = None
    location_id: int | None = None
    manager_id: int | None = None
    team_id: int | None = None
    band: str | None = None
    employment_type: str = "full_time"
    joining_date: date
    profile_photo: str | None = None
    password: str = "changeme123"
    role: str = "employee"


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    department_id: int | None = None
    designation_id: int | None = None
    location_id: int | None = None
    manager_id: int | None = None
    team_id: int | None = None
    band: str | None = None
    employment_type: str | None = None
    status: str | None = None
    profile_photo: str | None = None
    joining_date: date | None = None


class DepartmentInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DesignationInfo(BaseModel):
    id: int
    title: str
    band: str | None = None

    class Config:
        from_attributes = True


class LocationInfo(BaseModel):
    id: int
    name: str
    city: str | None = None

    class Config:
        from_attributes = True


class ManagerInfo(BaseModel):
    id: int
    first_name: str
    last_name: str
    employee_id: str

    class Config:
        from_attributes = True


class TeamInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class EmployeeResponse(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    department: DepartmentInfo | None = None
    designation: DesignationInfo | None = None
    location: LocationInfo | None = None
    manager: ManagerInfo | None = None
    team: TeamInfo | None = None
    direct_reports: list[ManagerInfo] = []
    band: str | None = None
    employment_type: str
    status: str
    joining_date: date
    profile_photo: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    per_page: int
