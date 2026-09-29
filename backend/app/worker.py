import logging
import signal
import time
from datetime import datetime

from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db import SessionLocal
from app.handlers import HANDLERS
from app.services import tasks
from app.storage import Storage, get_storage

log = logging.getLogger("tamago.worker")


def run_once(factory: sessionmaker[Session], storage: Storage, now: datetime | None = None) -> bool:
    """Claim and process one task. Returns False when the queue had nothing runnable."""
    with factory() as session:
        task = tasks.claim_next(session, now)
        if task is None:
            return False
        task_id, task_type, payload = task.id, task.type, task.payload

    try:
        handler = HANDLERS[task_type]
        with factory() as session:
            handler(session, payload, storage)
            session.commit()
    except Exception as exc:
        log.exception("task %s (%s) failed", task_id, task_type)
        with factory() as session:
            outcome = tasks.mark_failed_attempt(session, task_id, repr(exc), now)
        log.warning("task %s -> %s", task_id, outcome.value)
    else:
        with factory() as session:
            tasks.mark_done(session, task_id, now)
    return True


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    storage = get_storage()
    stop = False

    def _stop(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    log.info("worker started")
    while not stop:
        with SessionLocal() as session:
            reaped = tasks.reap_stale(session)
        if reaped:
            log.warning("reaped %s stale task(s)", reaped)
        if not run_once(SessionLocal, storage):
            time.sleep(settings.worker_poll_seconds)
    log.info("worker stopped")


if __name__ == "__main__":
    main()
