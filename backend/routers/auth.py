"""
Auth routes — thin wrapper. Supabase handles the actual auth flow.
These endpoints handle post-auth actions (onboarding, profile fetch).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import CurrentUserId
from core.database import get_db
from supabase import Client

router = APIRouter(prefix="/auth", tags=["auth"])


class OnboardingPayload(BaseModel):
    display_name: str
    university: Optional[str] = None
    financial_snapshot: dict = {}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    university: Optional[str] = None
    financial_snapshot: Optional[dict] = None


@router.get("/me")
def get_me(user_id: CurrentUserId, db: Client = Depends(get_db)):
    """Return the current user's profile + credibility snapshot."""
    profile = (
        db.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    cred = (
        db.table("user_total_credibility")
        .select("total_score")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    total_score = cred.data["total_score"] if cred.data else 100

    topic_cred = (
        db.table("user_topic_credibility")
        .select("topic, score")
        .eq("user_id", user_id)
        .execute()
    )

    return {
        **profile.data,
        "credibility": {
            "total_score": total_score,
            "topic_scores": {r["topic"]: r["score"] for r in (topic_cred.data or [])},
        },
    }


@router.post("/onboarding")
def complete_onboarding(
    payload: OnboardingPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """Called once after the user completes the onboarding wizard."""
    result = (
        db.table("profiles")
        .update(
            {
                "display_name": payload.display_name,
                "university": payload.university,
                "financial_snapshot": payload.financial_snapshot,
                "onboarding_complete": True,
            }
        )
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data[0]


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("profiles").update(updates).eq("id", user_id).execute()
    )
    return result.data[0]
