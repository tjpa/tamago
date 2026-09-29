from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_session
from app.models import Job, JobStatus
from app.schemas import DispatchIn, JobDetailOut, JobIn, JobOut
from app.services import jobs as svc

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get(session: Session, job_id: int) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "job not found")
    return job


def _guard(fn, *args):
    try:
        return fn(*args)
    except svc.InvalidTransition as e:
        raise HTTPException(409, str(e)) from e
    except svc.NotFound as e:
        raise HTTPException(404, str(e)) from e


@router.post("", response_model=JobOut, status_code=201)
def create_job(body: JobIn, session: Session = Depends(get_session)):
    job = svc.create_job(session, **body.model_dump())
    session.commit()
    return job


@router.get("", response_model=list[JobOut])
def list_jobs(status: JobStatus | None = None, session: Session = Depends(get_session)):
    stmt = select(Job).order_by(Job.id.desc())
    if status:
        stmt = stmt.where(Job.status == status)
    return session.scalars(stmt).all()


@router.get("/{job_id}", response_model=JobDetailOut)
def get_job(job_id: int, session: Session = Depends(get_session)):
    job = session.scalar(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.events), selectinload(Job.invoice))
    )
    if job is None:
        raise HTTPException(404, "job not found")
    return job


@router.post("/{job_id}/dispatch", response_model=JobOut)
def dispatch_job(job_id: int, body: DispatchIn, session: Session = Depends(get_session)):
    job = _guard(svc.dispatch, session, _get(session, job_id), body.driver_id, body.vehicle_id)
    session.commit()
    return job


@router.post("/{job_id}/start", response_model=JobOut)
def start_job(job_id: int, session: Session = Depends(get_session)):
    job = _guard(svc.transition, session, _get(session, job_id), JobStatus.in_transit)
    session.commit()
    return job


@router.post("/{job_id}/complete", response_model=JobOut)
def complete_job(job_id: int, session: Session = Depends(get_session)):
    job = _guard(svc.transition, session, _get(session, job_id), JobStatus.completed)
    session.commit()
    return job
