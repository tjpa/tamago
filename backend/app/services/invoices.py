from fpdf import FPDF
from sqlalchemy.orm import Session

from app.models import Invoice, Job, JobStatus
from app.services import jobs as job_service
from app.storage import Storage


def money(pence: int) -> str:
    return f"\u00a3{pence / 100:,.2f}"


def render_pdf(job: Job, number: str) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 12, "Invoice", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"Number: {number}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Job: {job.reference}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Customer: {job.customer_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.cell(0, 7, f"Pickup: {job.pickup_address}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Dropoff: {job.dropoff_address}", new_x="LMARGIN", new_y="NEXT")
    if job.description:
        pdf.multi_cell(0, 7, f"Details: {job.description}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"Total due: {money(job.price_pence)}", new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


def generate_for_job(session: Session, job_id: int, storage: Storage) -> None:
    """Idempotent: safe to run any number of times for the same job."""
    job = session.get(Job, job_id, with_for_update=True)
    if job is None or job.invoice is not None or job.status != JobStatus.completed:
        return
    number = f"INV-{job.id:05d}"
    key = f"invoices/{number}.pdf"
    storage.put(key, render_pdf(job, number), "application/pdf")
    session.add(Invoice(job=job, number=number, amount_pence=job.price_pence, document_key=key))
    job_service.transition(session, job, JobStatus.invoiced)
