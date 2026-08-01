from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import User, CreditTransaction, Job
from app.services.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

DAYS_BACK = 30


def _daily_series(db: Session, model, date_col, filter_clause=None, value_col=None):
    """Returns [{date: 'YYYY-MM-DD', value: N}] for the last DAYS_BACK days.

    value_col=None counts rows; otherwise sums that column (used for revenue).
    """
    since = datetime.utcnow() - timedelta(days=DAYS_BACK)
    day = func.date(date_col)
    agg = func.sum(value_col) if value_col is not None else func.count()
    q = db.query(day.label("d"), agg.label("v")).filter(date_col >= since)
    if filter_clause is not None:
        q = q.filter(filter_clause)
    rows = q.group_by(day).order_by(day).all()
    return [{"date": r.d, "value": int(r.v or 0)} for r in rows]


@router.get("/stats")
def get_stats(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_credits_outstanding = db.query(func.sum(User.credits)).scalar() or 0

    total_revenue_paise = db.query(func.sum(CreditTransaction.amount_paise)).filter(
        CreditTransaction.type == "purchase"
    ).scalar() or 0
    total_credits_granted_free = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.type == "admin_grant"
    ).scalar() or 0

    total_jobs_run = db.query(func.count(Job.id)).scalar() or 0
    posts_sum = 0
    for (stats,) in db.query(Job.stats).filter(Job.stats.isnot(None)).all():
        if stats:
            posts_sum += stats.get("post_count", 0) or 0

    signups_by_day = _daily_series(db, User, User.created_at)
    revenue_by_day = _daily_series(
        db, CreditTransaction, CreditTransaction.created_at,
        filter_clause=CreditTransaction.type == "purchase",
        value_col=CreditTransaction.amount_paise,
    )
    # convert paise -> rupees for the chart
    for row in revenue_by_day:
        row["value"] = round(row["value"] / 100, 2)

    return {
        "total_users": total_users,
        "total_revenue_inr": round(total_revenue_paise / 100, 2),
        "total_credits_outstanding": total_credits_outstanding,
        "total_credits_granted_free": total_credits_granted_free,
        "total_jobs_run": total_jobs_run,
        "total_posts_analyzed": posts_sum,
        "signups_by_day": signups_by_day,
        "revenue_by_day": revenue_by_day,
    }


@router.get("/users")
def list_users(
    search: str = Query("", alias="search"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search.strip():
        q = q.filter(User.email.ilike(f"%{search.strip()}%"))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for u in users:
        purchased_paise = db.query(func.sum(CreditTransaction.amount_paise)).filter(
            CreditTransaction.user_id == u.id, CreditTransaction.type == "purchase"
        ).scalar() or 0
        job_count = db.query(func.count(Job.id)).filter(Job.user_id == u.id).scalar() or 0
        result.append({
            "id": u.id,
            "email": u.email,
            "credits": u.credits,
            "total_purchased_inr": round(purchased_paise / 100, 2),
            "total_jobs": job_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "is_admin": bool(u.is_admin),
        })

    return {"total": total, "page": page, "page_size": page_size, "users": result}


@router.get("/users/{user_id}")
def get_user_detail(user_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    transactions = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == user_id
    ).order_by(CreditTransaction.created_at.desc()).all()

    jobs = db.query(Job).filter(Job.user_id == user_id).order_by(Job.created_at.desc()).all()

    return {
        "id": user.id,
        "email": user.email,
        "credits": user.credits,
        "is_admin": bool(user.is_admin),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "transactions": [
            {
                "id": t.id, "type": t.type, "amount": t.amount, "balance_after": t.balance_after,
                "job_id": t.job_id, "amount_paise": t.amount_paise, "note": t.note,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
        "jobs": [
            {
                "id": j.id, "topic": j.topic, "status": j.status,
                "post_count": (j.stats or {}).get("post_count", 0),
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
    }


class GrantCreditsRequest(BaseModel):
    amount: int
    note: str = ""


@router.post("/users/{user_id}/grant-credits")
def grant_credits(
    user_id: str, req: GrantCreditsRequest,
    admin: User = Depends(get_current_admin), db: Session = Depends(get_db),
):
    if req.amount == 0:
        raise HTTPException(status_code=400, detail="Amount must be non-zero")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.credits += req.amount
    db.add(CreditTransaction(
        user_id=user.id, type="admin_grant", amount=req.amount, balance_after=user.credits,
        note=req.note or f"Granted by {admin.email}",
    ))
    db.commit()
    db.refresh(user)
    return {"credits": user.credits}
