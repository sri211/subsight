from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models.database import get_db
from app.models.schemas import Job
from app.services.chat_agent import chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    job_id: str
    message: str
    history: list[ChatMessage] = []


@router.post("/")
def ask(req: ChatRequest, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "complete":
        raise HTTPException(status_code=400, detail="Research not yet complete")
    if not job.summary_context:
        raise HTTPException(status_code=400, detail="No summary context available")

    answer = chat(
        summary_context=job.summary_context,
        message=req.message,
        history=[{"role": m.role, "content": m.content} for m in req.history],
    )
    return {"answer": answer}
