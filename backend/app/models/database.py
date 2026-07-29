from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings
from pathlib import Path

Path(settings.database_url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate():
    """Lightweight, idempotent column migrations for the existing SQLite file.

    Base.metadata.create_all() only creates missing tables — it never alters
    columns on tables that already exist, so new columns need adding by hand.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "jobs" not in inspector.get_table_names():
        return  # fresh DB — create_all() will build the full current schema
    cols = {c["name"] for c in inspector.get_columns("jobs")}
    if "user_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN user_id VARCHAR"))


def init_db():
    from app.models import schemas  # noqa: F401
    _migrate()
    Base.metadata.create_all(bind=engine)
