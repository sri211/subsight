from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import Job, User
from app.services.auth import get_current_user


def get_owned_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Job:
    """Loads a job and verifies it belongs to the requesting user.

    Returns 404 (not 403) on a mismatch so job IDs can't be used to probe
    whether a given ID exists at all.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
