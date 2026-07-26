from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from pydantic import BaseModel

from app.models.database import get_db
from app.models.schemas import Job
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/api/research", tags=["research"])


class StartRequest(BaseModel):
    topic: str
    max_posts: int = 100


@router.get("/")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "topic": j.topic,
            "status": j.status,
            "progress": j.progress,
            "stage": j.stage,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "post_count": (j.stats or {}).get("post_count", 0),
        }
        for j in jobs
    ]


@router.post("/start")
def start_research(req: StartRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    job = Job(id=str(uuid4()), topic=req.topic.strip(), status="pending", progress=0, stage="Starting...")
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_pipeline, job.id, req.topic.strip(), req.max_posts, db)
    return {"job_id": job.id}


@router.get("/{job_id}/status")
def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "error": job.error,
    }


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"deleted": True}
