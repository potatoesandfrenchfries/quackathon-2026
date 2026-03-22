"""
Goals router — personal savings goals (replaces the frontend mock store).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import CurrentUserId
from core.database import get_db
from supabase import Client

router = APIRouter(prefix="/goals", tags=["goals"])


class CreateGoalPayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    emoji: str = Field(default="🎯", max_length=4)
    color: str = Field(default="blue")
    target_amount: float = Field(..., gt=0)
    deadline: str  # ISO date string "YYYY-MM-DD"
    is_shared: bool = False


class AddProgressPayload(BaseModel):
    amount: float = Field(..., gt=0)


@router.get("/")
def list_goals(user_id: CurrentUserId, db: Client = Depends(get_db)):
    result = (
        db.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/shared")
def shared_goals(db: Client = Depends(get_db)):
    """Public feed of shared goals — light social accountability."""
    result = (
        db.table("goals")
        .select("*, profiles(username, display_name)")
        .eq("is_shared", True)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data


@router.post("/", status_code=201)
def create_goal(
    payload: CreateGoalPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    result = (
        db.table("goals")
        .insert({
            "user_id":       user_id,
            "title":         payload.title,
            "emoji":         payload.emoji,
            "color":         payload.color,
            "target_amount": payload.target_amount,
            "deadline":      payload.deadline,
            "is_shared":     payload.is_shared,
        })
        .execute()
    )
    return result.data[0]


@router.patch("/{goal_id}/progress")
def add_progress(
    goal_id: UUID,
    payload: AddProgressPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """
    Add funds to a goal. If target is reached, emits a MODULE_COMPLETED
    credibility event (+10) and returns a celebration message.
    """
    goal = (
        db.table("goals")
        .select("user_id, current_amount, target_amount, title")
        .eq("id", str(goal_id))
        .maybe_single()
        .execute()
    )
    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your goal")

    new_amount = min(
        goal.data["current_amount"] + payload.amount,
        goal.data["target_amount"],
    )
    db.table("goals").update({"current_amount": new_amount}).eq("id", str(goal_id)).execute()

    completed = new_amount >= goal.data["target_amount"]
    if completed:
        from services.credibility_engine import on_goal_completed
        on_goal_completed(db, user_id=user_id, goal_id=str(goal_id))

    return {
        "current_amount": new_amount,
        "target_amount":  goal.data["target_amount"],
        "completed":      completed,
        "message": f"🎉 '{goal.data['title']}' complete! +10 credibility" if completed else None,
    }


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    goal = (
        db.table("goals")
        .select("user_id")
        .eq("id", str(goal_id))
        .maybe_single()
        .execute()
    )
    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your goal")

    db.table("goals").delete().eq("id", str(goal_id)).execute()
    return {"deleted": True}
