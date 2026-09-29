from datetime import timedelta

import pytest
from sqlalchemy import select

from app import handlers
from app.db import SessionLocal
from app.models import Invoice, Job, JobStatus, Task, TaskStatus, utcnow
from app.services import tasks
from app.storage import MemoryStorage
from app.worker import run_once
from tests.test_jobs import make_driver, make_job


@pytest.fixture
def storage():
    return MemoryStorage()


def drain(storage, limit=20):
    n = 0
    while n < limit and run_once(SessionLocal, storage):
        n += 1
    return n


def complete_job(client):
    driver = make_driver(client)
    job = make_job(client)
    client.post(f"/jobs/{job['id']}/dispatch", json={"driver_id": driver["id"]})
    client.post(f"/jobs/{job['id']}/start")
    client.post(f"/jobs/{job['id']}/complete")
    return job["id"]


def all_tasks(session):
    return session.scalars(select(Task).order_by(Task.id)).all()


def test_transitions_write_outbox_events_in_same_transaction(client, session):
    complete_job(client)
    events = [(t.payload["from_status"], t.payload["to_status"]) for t in all_tasks(session)]
    assert events == [
        (None, "created"),
        ("created", "dispatched"),
        ("dispatched", "in_transit"),
        ("in_transit", "completed"),
    ]
    assert all(t.status == TaskStatus.pending for t in all_tasks(session))


def test_failed_request_leaves_no_events(client, session):
    job = make_job(client)
    before = len(all_tasks(session))
    assert client.post(f"/jobs/{job['id']}/complete").status_code == 409
    session.expire_all()
    assert len(all_tasks(session)) == before


def test_end_to_end_completed_job_gets_invoiced(client, session, storage):
    job_id = complete_job(client)
    drain(storage)

    detail = client.get(f"/jobs/{job_id}").json()
    assert detail["status"] == "invoiced"
    assert detail["invoice"]["number"] == f"INV-{job_id:05d}"
    assert detail["invoice"]["amount_pence"] == 12500
    key = detail["invoice"]["document_key"]
    assert storage.objects[key][0].startswith(b"%PDF")
    assert [e["to_status"] for e in detail["events"]][-2:] == ["completed", "invoiced"]

    session.expire_all()
    assert {t.status for t in all_tasks(session)} == {TaskStatus.done}


def test_invoice_generation_is_idempotent(client, session, storage):
    job_id = complete_job(client)
    drain(storage)
    payload = {"job_id": job_id, "to_status": "completed"}
    for _ in range(3):
        with SessionLocal() as s:
            handlers.on_job_status_changed(s, payload, storage)
            s.commit()
    with SessionLocal() as s:
        assert len(s.scalars(select(Invoice)).all()) == 1
        assert s.get(Job, job_id).status == JobStatus.invoiced


def test_claims_do_not_overlap_between_concurrent_workers(client, session):
    for _ in range(3):
        make_job(client)
    now = utcnow()
    with SessionLocal() as a, SessionLocal() as b:
        first = tasks.select_next(a, now)
        second = tasks.select_next(b, now)
        assert first is not None and second is not None
        assert first.id != second.id


def test_failure_retries_with_backoff_then_fails_permanently(client, session, storage, monkeypatch):
    def boom(*_):
        raise RuntimeError("storage down")

    monkeypatch.setitem(handlers.HANDLERS, "job.status_changed", boom)
    make_job(client)
    with SessionLocal() as s:
        s.get(Task, 1).max_attempts = 3
        s.commit()

    t0 = utcnow()
    assert run_once(SessionLocal, storage, now=t0)
    session.expire_all()
    task = session.get(Task, 1)
    assert (task.status, task.attempts) == (TaskStatus.pending, 1)
    assert task.run_after == t0 + timedelta(seconds=5)
    assert "storage down" in task.last_error

    assert not run_once(SessionLocal, storage, now=t0 + timedelta(seconds=1))

    t1 = t0 + timedelta(seconds=6)
    assert run_once(SessionLocal, storage, now=t1)
    session.expire_all()
    assert session.get(Task, 1).run_after == t1 + timedelta(seconds=10)

    t2 = t1 + timedelta(seconds=11)
    assert run_once(SessionLocal, storage, now=t2)
    session.expire_all()
    task = session.get(Task, 1)
    assert (task.status, task.attempts) == (TaskStatus.failed, 3)
    assert task.finished_at is not None
    assert not run_once(SessionLocal, storage, now=t2 + timedelta(days=1))


def test_task_recovers_after_transient_failure(client, session, storage, monkeypatch):
    real = handlers.HANDLERS["job.status_changed"]
    calls = {"n": 0}

    def flaky(s, payload, st):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("blip")
        return real(s, payload, st)

    monkeypatch.setitem(handlers.HANDLERS, "job.status_changed", flaky)
    job_id = complete_job(client)
    later = utcnow() + timedelta(minutes=10)
    while run_once(SessionLocal, storage, now=later):
        later += timedelta(minutes=10)
    assert client.get(f"/jobs/{job_id}").json()["status"] == "invoiced"


def test_unknown_task_type_fails_eventually(session, storage):
    with SessionLocal() as s:
        tasks.enqueue(s, "nope", {}, max_attempts=1)
        s.commit()
    assert run_once(SessionLocal, storage)
    session.expire_all()
    assert session.get(Task, 1).status == TaskStatus.failed


def test_reap_stale_returns_crashed_tasks_to_queue(session):
    with SessionLocal() as s:
        tasks.enqueue(s, "job.status_changed", {})
        s.commit()
    now = utcnow()
    with SessionLocal() as s:
        tasks.claim_next(s, now)
    with SessionLocal() as s:
        assert tasks.reap_stale(s, now + timedelta(hours=1)) == 1
    session.expire_all()
    task = session.get(Task, 1)
    assert task.status == TaskStatus.pending and task.attempts == 1


def test_invoice_document_endpoint(client, storage):
    from app.main import app
    from app.storage import get_storage

    app.dependency_overrides[get_storage] = lambda: storage
    try:
        job_id = complete_job(client)
        drain(storage)
        invoice = client.get(f"/jobs/{job_id}").json()["invoice"]
        r = client.get(f"/invoices/{invoice['id']}/document")
        assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
        assert r.content.startswith(b"%PDF")
    finally:
        app.dependency_overrides.clear()
