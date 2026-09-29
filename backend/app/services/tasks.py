"""Database-backed task queue.

Producers call ``enqueue`` inside the same transaction as their state change (transactional
outbox), so an event exists if and only if the change committed. Workers claim rows with
``FOR UPDATE SKIP LOCKED`` so concurrent workers never take the same task. Delivery is
at-least-once: handlers must be idempotent.
"""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Task, TaskStatus, utcnow

BACKOFF_BASE_SECONDS = 5
BACKOFF_CAP_SECONDS = 300


def enqueue(session: Session, type_: str, payload: dict, max_attempts: int | None = None) -> Task:
    task = Task(
        type=type_,
        payload=payload,
        max_attempts=max_attempts or settings.task_max_attempts,
    )
    session.add(task)
    return task


def backoff(attempts: int) -> timedelta:
    seconds = min(BACKOFF_BASE_SECONDS * 2 ** max(attempts - 1, 0), BACKOFF_CAP_SECONDS)
    return timedelta(seconds=seconds)


def select_next(session: Session, now: datetime) -> Task | None:
    return session.scalar(
        select(Task)
        .where(Task.status == TaskStatus.pending, Task.run_after <= now)
        .order_by(Task.id)
        .with_for_update(skip_locked=True)
        .limit(1)
    )


def claim_next(session: Session, now: datetime | None = None) -> Task | None:
    now = now or utcnow()
    task = select_next(session, now)
    if task is None:
        return None
    task.status = TaskStatus.running
    task.locked_at = now
    task.attempts += 1
    session.commit()
    return task


def mark_done(session: Session, task_id: int, now: datetime | None = None) -> None:
    task = session.get(Task, task_id)
    task.status = TaskStatus.done
    task.finished_at = now or utcnow()
    task.locked_at = None
    task.last_error = None
    session.commit()


def mark_failed_attempt(
    session: Session, task_id: int, error: str, now: datetime | None = None
) -> TaskStatus:
    now = now or utcnow()
    task = session.get(Task, task_id)
    task.last_error = error[:2000]
    task.locked_at = None
    if task.attempts >= task.max_attempts:
        task.status = TaskStatus.failed
        task.finished_at = now
    else:
        task.status = TaskStatus.pending
        task.run_after = now + backoff(task.attempts)
    session.commit()
    return task.status


def reap_stale(session: Session, now: datetime | None = None) -> int:
    """Return tasks whose worker died mid-flight to the queue (or fail them if out of attempts)."""
    now = now or utcnow()
    cutoff = now - timedelta(seconds=settings.task_lock_timeout_seconds)
    stale = session.scalars(
        select(Task)
        .where(Task.status == TaskStatus.running, Task.locked_at < cutoff)
        .with_for_update(skip_locked=True)
    ).all()
    for task in stale:
        task.last_error = "worker lost (lock timed out)"
        task.locked_at = None
        if task.attempts >= task.max_attempts:
            task.status = TaskStatus.failed
            task.finished_at = now
        else:
            task.status = TaskStatus.pending
            task.run_after = now
    session.commit()
    return len(stale)
