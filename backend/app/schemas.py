from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import InvoiceStatus, JobStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DriverIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = None


class DriverOut(ORM):
    id: int
    name: str
    phone: str | None
    active: bool


class VehicleIn(BaseModel):
    plate: str = Field(min_length=1, max_length=20)
    kind: str = "van"


class VehicleOut(ORM):
    id: int
    plate: str
    kind: str


class JobIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=160)
    pickup_address: str = Field(min_length=1, max_length=300)
    dropoff_address: str = Field(min_length=1, max_length=300)
    description: str = ""
    price_pence: int = Field(gt=0)


class DispatchIn(BaseModel):
    driver_id: int
    vehicle_id: int | None = None


class JobEventOut(ORM):
    from_status: JobStatus | None
    to_status: JobStatus
    at: datetime


class InvoiceOut(ORM):
    id: int
    job_id: int
    number: str
    amount_pence: int
    status: InvoiceStatus
    document_key: str | None
    issued_at: datetime


class JobOut(ORM):
    id: int
    reference: str
    customer_name: str
    pickup_address: str
    dropoff_address: str
    description: str
    price_pence: int
    status: JobStatus
    driver: DriverOut | None
    vehicle: VehicleOut | None
    created_at: datetime
    updated_at: datetime


class JobDetailOut(JobOut):
    events: list[JobEventOut]
    invoice: InvoiceOut | None
