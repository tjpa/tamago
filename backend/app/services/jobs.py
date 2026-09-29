from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Driver, Job, JobEvent, JobStatus, Vehicle

TRANSITIONS: dict[JobStatus, JobStatus] = {
    JobStatus.created: JobStatus.dispatched,
    JobStatus.dispatched: JobStatus.in_transit,
    JobStatus.in_transit: JobStatus.completed,
    JobStatus.completed: JobStatus.invoiced,
}


class InvalidTransition(Exception):
    pass


class NotFound(Exception):
    pass


def next_reference(session: Session) -> str:
    last = session.scalar(select(Job.id).order_by(Job.id.desc()).limit(1)) or 0
    return f"JOB-{last + 1:05d}"


def record(session: Session, job: Job, to: JobStatus, from_: JobStatus | None) -> None:
    session.add(JobEvent(job=job, from_status=from_, to_status=to))


def create_job(session: Session, **fields) -> Job:
    job = Job(reference=next_reference(session), status=JobStatus.created, **fields)
    session.add(job)
    session.flush()
    record(session, job, JobStatus.created, None)
    return job


def transition(session: Session, job: Job, to: JobStatus) -> Job:
    if TRANSITIONS.get(job.status) != to:
        raise InvalidTransition(f"cannot move job from {job.status.value} to {to.value}")
    previous = job.status
    job.status = to
    record(session, job, to, previous)
    return job


def dispatch(session: Session, job: Job, driver_id: int, vehicle_id: int | None) -> Job:
    driver = session.get(Driver, driver_id)
    if driver is None or not driver.active:
        raise NotFound("driver not found or inactive")
    if vehicle_id is not None and session.get(Vehicle, vehicle_id) is None:
        raise NotFound("vehicle not found")
    transition(session, job, JobStatus.dispatched)
    job.driver_id = driver_id
    job.vehicle_id = vehicle_id
    return job
