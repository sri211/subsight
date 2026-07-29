from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from pydantic import BaseModel

from app.models.database import get_db
from app.models.schemas import Job, User, CreditTransaction
from app.services.auth import get_current_user
from app.services.pipeline import run_pipeline
from app.routers.deps import get_owned_job

router = APIRouter(prefix="/api/research", tags=["research"])


class StartRequest(BaseModel):
    topic: str
    max_posts: int = 100


@router.get("/")
def list_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()
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
def start_research(
    req: StartRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    if user.credits < req.max_posts:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. You have {user.credits}, this research needs {req.max_posts}.",
        )

    job = Job(
        id=str(uuid4()), user_id=user.id, topic=req.topic.strip(),
        status="pending", progress=0, stage="Starting...",
    )
    db.add(job)

    user.credits -= req.max_posts
    db.add(CreditTransaction(
        user_id=user.id, type="debit", amount=-req.max_posts, balance_after=user.credits, job_id=job.id,
    ))
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_pipeline, job.id, req.topic.strip(), req.max_posts, db)
    return {"job_id": job.id}


@router.get("/{job_id}/status")
def get_status(job: Job = Depends(get_owned_job)):
    return {
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "error": job.error,
    }


@router.delete("/{job_id}")
def delete_job(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)):
    db.delete(job)
    db.commit()
    return {"deleted": True}
