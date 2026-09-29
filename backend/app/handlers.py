from collections.abc import Callable

from sqlalchemy.orm import Session

from app.models import JobStatus
from app.services import invoices
from app.storage import Storage

Handler = Callable[[Session, dict, Storage], None]


def on_job_status_changed(session: Session, payload: dict, storage: Storage) -> None:
    if payload.get("to_status") == JobStatus.completed.value:
        invoices.generate_for_job(session, payload["job_id"], storage)


HANDLERS: dict[str, Handler] = {
    "job.status_changed": on_job_status_changed,
}
