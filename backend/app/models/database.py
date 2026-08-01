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


def _add_column_if_missing(inspector, table: str, column: str, ddl_type: str):
    if table not in inspector.get_table_names():
        return  # table doesn't exist yet — create_all() will build it fresh
    cols = {c["name"] for c in inspector.get_columns(table)}
    if column not in cols:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


def _migrate():
    """Lightweight, idempotent column migrations for the existing SQLite file.

    Base.metadata.create_all() only creates missing tables — it never alters
    columns on tables that already exist, so new columns need adding by hand.
    """
    from sqlalchemy import inspect

    inspector = inspect(engine)
    _add_column_if_missing(inspector, "jobs", "user_id", "VARCHAR")
    _add_column_if_missing(inspector, "users", "is_admin", "BOOLEAN DEFAULT 0")
    _add_column_if_missing(inspector, "credit_transactions", "amount_paise", "INTEGER")
    _add_column_if_missing(inspector, "credit_transactions", "note", "TEXT")


def init_db():
    from app.models import schemas  # noqa: F401
    _migrate()
    Base.metadata.create_all(bind=engine)
