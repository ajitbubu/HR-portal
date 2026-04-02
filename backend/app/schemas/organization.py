from pydantic import BaseModel, ConfigDict


class BusinessUnitCreate(BaseModel):
    name: str
    description: str | None = None


class BusinessUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


class DepartmentCreate(BaseModel):
    name: str
    code: str | None = None
    business_unit_id: int | None = None
    head_id: int | None = None
    description: str | None = None


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str | None = None
    business_unit_id: int | None = None
    head_id: int | None = None
    description: str | None = None


class TeamCreate(BaseModel):
    name: str
    department_id: int
    lead_id: int | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    department_id: int
    lead_id: int | None = None


class LocationCreate(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


class DesignationCreate(BaseModel):
    title: str
    level: int = 1
    band: str | None = None
    description: str | None = None


class DesignationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    level: int
    band: str | None = None
