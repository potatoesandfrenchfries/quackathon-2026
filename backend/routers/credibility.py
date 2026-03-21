from uuid import UUID

from fastapi import APIRouter, Depends

from core.auth import CurrentUserId
from core.database import get_db
from services.credibility_engine import get_snapshot
from supabase import Client

router = APIRouter(prefix="/credibility", tags=["credibility"])


@router.get("/me")
def my_credibility(user_id: CurrentUserId, db: Client = Depends(get_db)):
    """Full credibility snapshot for the current user."""
    snap = get_snapshot(db, user_id)
    return snap.__dict__


@router.get("/user/{user_id}")
def user_credibility(user_id: UUID, db: Client = Depends(get_db)):
    """Public credibility snapshot for any user."""
    snap = get_snapshot(db, str(user_id))
    return snap.__dict__


@router.get("/me/history")
def my_credibility_history(
    limit: int = 50,
    user_id: CurrentUserId = None,
    db: Client = Depends(get_db),
):
    """Recent credibility events for the current user (for the HUD ledger)."""
    result = (
        db.table("credibility_events")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.get("/leaderboard")
def leaderboard(limit: int = 20, db: Client = Depends(get_db)):
    """Top users by total credibility score."""
    result = (
        db.table("user_total_credibility")
        .select("user_id, total_score, profiles(username, display_name, university)")
        .order("total_score", desc=True)
        .limit(limit)
        .execute()
    )
    rows = result.data or []
    # Annotate tier
    from services.credibility_engine import _tier_from_score
    for row in rows:
        tier, color = _tier_from_score(row["total_score"])
        row["tier"] = tier
        row["tier_color"] = color
    return rows
