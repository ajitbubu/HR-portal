from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr


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
    band: str | None = None
    employment_type: str | None = None
    status: str | None = None
    profile_photo: str | None = None


class DepartmentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class DesignationInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    band: str | None = None


class LocationInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city: str | None = None


class ManagerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    employee_id: str


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    band: str | None = None
    employment_type: str
    status: str
    joining_date: date
    profile_photo: str | None = None
    created_at: datetime | None = None


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    per_page: int
