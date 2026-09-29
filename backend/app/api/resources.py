from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Driver, Invoice, Vehicle
from app.schemas import DriverIn, DriverOut, InvoiceOut, VehicleIn, VehicleOut
from app.storage import Storage, get_storage

drivers = APIRouter(prefix="/drivers", tags=["drivers"])
vehicles = APIRouter(prefix="/vehicles", tags=["vehicles"])
invoices = APIRouter(prefix="/invoices", tags=["invoices"])


@drivers.post("", response_model=DriverOut, status_code=201)
def create_driver(body: DriverIn, session: Session = Depends(get_session)):
    driver = Driver(**body.model_dump())
    session.add(driver)
    session.commit()
    return driver


@drivers.get("", response_model=list[DriverOut])
def list_drivers(session: Session = Depends(get_session)):
    return session.scalars(select(Driver).order_by(Driver.name)).all()


@vehicles.post("", response_model=VehicleOut, status_code=201)
def create_vehicle(body: VehicleIn, session: Session = Depends(get_session)):
    if session.scalar(select(Vehicle).where(Vehicle.plate == body.plate)):
        raise HTTPException(409, "plate already exists")
    vehicle = Vehicle(**body.model_dump())
    session.add(vehicle)
    session.commit()
    return vehicle


@vehicles.get("", response_model=list[VehicleOut])
def list_vehicles(session: Session = Depends(get_session)):
    return session.scalars(select(Vehicle).order_by(Vehicle.plate)).all()


@invoices.get("", response_model=list[InvoiceOut])
def list_invoices(session: Session = Depends(get_session)):
    return session.scalars(select(Invoice).order_by(Invoice.id.desc())).all()


@invoices.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, session: Session = Depends(get_session)):
    invoice = session.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "invoice not found")
    return invoice


@invoices.get("/{invoice_id}/document")
def get_invoice_document(
    invoice_id: int,
    session: Session = Depends(get_session),
    storage: Storage = Depends(get_storage),
):
    invoice = session.get(Invoice, invoice_id)
    if invoice is None or not invoice.document_key:
        raise HTTPException(404, "invoice document not found")
    return Response(storage.get(invoice.document_key), media_type="application/pdf")
