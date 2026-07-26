from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db, SessionLocal
from app.models.schemas import Job
from app.routers import research, results, chat

app = FastAPI(title="SubSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "https://subsight.in", "https://www.subsight.in",
    ],
    # Vercel preview deployments get random subdomains like
    # subsight-git-main-sri211.vercel.app — allow the whole project pattern
    # so previews work without editing this list every deploy
    allow_origin_regex=r"https://subsight.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research.router)
app.include_router(results.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup():
    init_db()
    # Reset any jobs that were left running from a previous server session
    db = SessionLocal()
    try:
        stuck = db.query(Job).filter(Job.status.in_(["running", "pending"])).all()
        for job in stuck:
            job.status = "failed"
            job.stage = "Server restarted — please run again"
            job.error = "Background task was lost on server restart."
        if stuck:
            db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health():
    from app.config import settings
    from app.services.reddit import data_source_name
    return {
        "status": "ok",
        "data_source": data_source_name(),
        "apify_token_loaded": bool(settings.apify_token),
    }
