"""
Challenges router — Habitica-style group financial habit challenges.

Students join time-boxed challenges, check in weekly, and complete them
for credibility rewards. The live participant count ("you'll be #24") creates
social momentum that keeps students accountable.
"""
import json
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import CurrentUserId
from core.config import settings
from core.database import get_db
from supabase import Client

router = APIRouter(prefix="/challenges", tags=["challenges"])

VALID_TOPICS = {"rent", "loans", "budgeting", "investing", "overdraft", "savings", "general"}


class CreateChallengePayload(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    topic: str
    target_description: str = Field(..., min_length=5, max_length=200)
    duration_days: int = Field(default=30, ge=7, le=365)


class CheckInPayload(BaseModel):
    status: str = Field(..., pattern="^(on_track|slipped)$")


# ─── List & Browse ───────────────────────────────────────────────────────────

@router.get("/")
def list_challenges(db: Client = Depends(get_db)):
    """All active challenges sorted by participant count (most popular first)."""
    result = (
        db.table("challenges")
        .select("*")
        .eq("is_active", True)
        .order("participant_count", desc=True)
        .execute()
    )
    return result.data


@router.get("/recommended")
def recommended_challenges(
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """
    AI-personalised top-3 challenges for this user based on their
    financial_snapshot. Uses Claude Haiku — cheap, fast.
    """
    # Fetch user snapshot
    profile = (
        db.table("profiles")
        .select("financial_snapshot")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    snapshot = (profile.data or {}).get("financial_snapshot", {})

    # Fetch active challenges
    challenges_result = (
        db.table("challenges")
        .select("id, title, description, topic, participant_count")
        .eq("is_active", True)
        .order("participant_count", desc=True)
        .limit(20)
        .execute()
    )
    challenges = challenges_result.data or []

    if not challenges:
        return []

    # Ask Claude Haiku to rank by relevance
    prompt = f"""A UK student has this financial situation:
{json.dumps(snapshot, indent=2) if snapshot else "No snapshot provided."}

Here are available challenges (JSON list):
{json.dumps([{"id": c["id"], "title": c["title"], "description": c["description"], "topic": c["topic"]} for c in challenges], indent=2)}

Pick the 3 most relevant challenges for this student's specific situation.
Return ONLY a JSON array (no prose):
[{{"challenge_id": "<uuid>", "reason": "<1 sentence why this fits them>"}}]
"""
    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        recs = json.loads(resp.content[0].text.strip())
        # Enrich with full challenge data
        by_id = {c["id"]: c for c in challenges}
        return [
            {**by_id[r["challenge_id"]], "recommendation_reason": r["reason"]}
            for r in recs
            if r.get("challenge_id") in by_id
        ]
    except Exception as exc:
        print(f"[Challenges] Recommendation failed: {exc}")
        # Fallback: return top 3 by participant count
        return challenges[:3]


@router.get("/mine")
def my_challenges(user_id: CurrentUserId, db: Client = Depends(get_db)):
    """Challenges the current user has joined."""
    result = (
        db.table("challenge_participants")
        .select("*, challenges(*)")
        .eq("user_id", user_id)
        .neq("status", "abandoned")
        .order("joined_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{challenge_id}")
def get_challenge(
    challenge_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """Single challenge with the current user's participation status."""
    challenge = (
        db.table("challenges")
        .select("*")
        .eq("id", str(challenge_id))
        .maybe_single()
        .execute()
    )
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Check if the current user has joined
    participation = (
        db.table("challenge_participants")
        .select("*")
        .eq("challenge_id", str(challenge_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    return {**challenge.data, "my_participation": participation.data}


@router.get("/{challenge_id}/participants")
def list_participants(
    challenge_id: UUID,
    limit: int = 20,
    offset: int = 0,
    db: Client = Depends(get_db),
):
    """Paginated participant list with username, tier, and status — for social proof."""
    result = (
        db.table("challenge_participants")
        .select("join_number, status, checkin_streak, joined_at, profiles(username, display_name)")
        .eq("challenge_id", str(challenge_id))
        .neq("status", "abandoned")
        .order("join_number")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


# ─── Actions ─────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_challenge(
    payload: CreateChallengePayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    if payload.topic not in VALID_TOPICS:
        raise HTTPException(status_code=400, detail=f"Invalid topic. Choose from: {VALID_TOPICS}")

    result = (
        db.table("challenges")
        .insert({
            "created_by":          user_id,
            "title":               payload.title,
            "description":         payload.description,
            "topic":               payload.topic,
            "target_description":  payload.target_description,
            "duration_days":       payload.duration_days,
        })
        .execute()
    )
    return result.data[0]


@router.post("/{challenge_id}/join", status_code=201)
def join_challenge(
    challenge_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """
    Join a challenge. Returns the user's join_number ("You're #24!").
    Idempotent — re-joining an abandoned challenge reactivates it.
    """
    challenge = (
        db.table("challenges")
        .select("id, is_active, participant_count")
        .eq("id", str(challenge_id))
        .maybe_single()
        .execute()
    )
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if not challenge.data["is_active"]:
        raise HTTPException(status_code=400, detail="Challenge is no longer active")

    # Check if already a participant
    existing = (
        db.table("challenge_participants")
        .select("id, status")
        .eq("challenge_id", str(challenge_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        if existing.data["status"] != "abandoned":
            raise HTTPException(status_code=400, detail="Already in this challenge")
        # Re-activate
        db.table("challenge_participants").update(
            {"status": "active", "checkin_streak": 0, "last_checkin_at": None}
        ).eq("id", existing.data["id"]).execute()
        return {"message": "Rejoined challenge", "join_number": None}

    join_number = (challenge.data["participant_count"] or 0) + 1
    result = (
        db.table("challenge_participants")
        .insert({
            "challenge_id": str(challenge_id),
            "user_id":      user_id,
            "join_number":  join_number,
        })
        .execute()
    )
    return {**result.data[0], "message": f"You're #{join_number} to join!"}


@router.patch("/{challenge_id}/checkin")
def check_in(
    challenge_id: UUID,
    payload: CheckInPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """
    Weekly check-in.
    on_track → increments streak.
    slipped  → resets streak to 0 (no credibility penalty — students need to feel safe).
    """
    from datetime import datetime, timezone
    participation = (
        db.table("challenge_participants")
        .select("id, status, checkin_streak")
        .eq("challenge_id", str(challenge_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not participation.data:
        raise HTTPException(status_code=404, detail="You haven't joined this challenge")
    if participation.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Challenge already completed or abandoned")

    now = datetime.now(timezone.utc).isoformat()
    if payload.status == "on_track":
        new_streak = (participation.data["checkin_streak"] or 0) + 1
        db.table("challenge_participants").update(
            {"checkin_streak": new_streak, "last_checkin_at": now}
        ).eq("id", participation.data["id"]).execute()
        return {"streak": new_streak, "message": f"🔥 {new_streak}-week streak!"}
    else:
        db.table("challenge_participants").update(
            {"checkin_streak": 0, "last_checkin_at": now}
        ).eq("id", participation.data["id"]).execute()
        return {"streak": 0, "message": "No worries — back at it next week."}


@router.patch("/{challenge_id}/complete")
def complete_challenge(
    challenge_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """Mark a challenge as completed and award credibility."""
    from datetime import datetime, timezone
    participation = (
        db.table("challenge_participants")
        .select("id, status")
        .eq("challenge_id", str(challenge_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not participation.data:
        raise HTTPException(status_code=404, detail="You haven't joined this challenge")
    if participation.data["status"] == "completed":
        raise HTTPException(status_code=400, detail="Already completed")
    if participation.data["status"] == "abandoned":
        raise HTTPException(status_code=400, detail="Challenge was abandoned")

    now = datetime.now(timezone.utc).isoformat()
    db.table("challenge_participants").update(
        {"status": "completed", "completed_at": now}
    ).eq("id", participation.data["id"]).execute()

    # Award credibility
    from services.credibility_engine import on_challenge_completed
    on_challenge_completed(db, user_id=user_id, challenge_id=str(challenge_id))

    # Fetch updated completed count for the celebration message
    challenge = (
        db.table("challenges")
        .select("completed_count, title")
        .eq("id", str(challenge_id))
        .maybe_single()
        .execute()
    )
    completed_count = (challenge.data or {}).get("completed_count", 1)

    return {
        "message": f"🎉 You're 1 of {completed_count} to complete '{challenge.data['title']}'!",
        "credibility_awarded": settings.challenge_completed_delta,
    }


@router.delete("/{challenge_id}/leave")
def leave_challenge(
    challenge_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """Leave a challenge — no credibility penalty."""
    participation = (
        db.table("challenge_participants")
        .select("id, status")
        .eq("challenge_id", str(challenge_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not participation.data:
        raise HTTPException(status_code=404, detail="You haven't joined this challenge")

    db.table("challenge_participants").update(
        {"status": "abandoned"}
    ).eq("id", participation.data["id"]).execute()
    return {"message": "Left the challenge. Come back anytime."}
