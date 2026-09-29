import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class JobStatus(enum.StrEnum):
    created = "created"
    dispatched = "dispatched"
    in_transit = "in_transit"
    completed = "completed"
    invoiced = "invoiced"


class InvoiceStatus(enum.StrEnum):
    issued = "issued"
    paid = "paid"


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    active: Mapped[bool] = mapped_column(default=True)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    plate: Mapped[str] = mapped_column(String(20), unique=True)
    kind: Mapped[str] = mapped_column(String(60), default="van")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    pickup_address: Mapped[str] = mapped_column(String(300))
    dropoff_address: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    price_pence: Mapped[int] = mapped_column(Integer)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status", native_enum=False, length=20),
        default=JobStatus.created,
        index=True,
    )
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    driver: Mapped[Driver | None] = relationship()
    vehicle: Mapped[Vehicle | None] = relationship()
    events: Mapped[list["JobEvent"]] = relationship(
        back_populates="job", order_by="JobEvent.id", cascade="all, delete-orphan"
    )
    invoice: Mapped["Invoice | None"] = relationship(back_populates="job")


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[JobStatus | None] = mapped_column(
        Enum(JobStatus, name="job_status", native_enum=False, length=20)
    )
    to_status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status", native_enum=False, length=20)
    )
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job: Mapped[Job] = relationship(back_populates="events")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), unique=True)
    number: Mapped[str] = mapped_column(String(30), unique=True)
    amount_pence: Mapped[int] = mapped_column(Integer)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status", native_enum=False, length=20),
        default=InvoiceStatus.issued,
    )
    document_key: Mapped[str | None] = mapped_column(String(300))
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job: Mapped[Job] = relationship(back_populates="invoice")
