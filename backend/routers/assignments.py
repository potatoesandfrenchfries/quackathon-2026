from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from core.auth import CurrentUserId
from core.database import get_db

router = APIRouter(prefix="/assignments", tags=["assignments"])

DIFFICULTY_DELTA: dict[str, int] = {"easy": 5, "medium": 10, "hard": 20}


class CreateAssignmentPayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    due_date: str  # ISO date string "YYYY-MM-DD"
    difficulty: str = Field(default="medium")


class UpdateStatusPayload(BaseModel):
    # completed is blocked here — use /complete instead
    status: str = Field(..., pattern="^(todo|in_progress)$")


# ─── List ────────────────────────────────────────────────────────────────────

@router.get("/")
def list_assignments(user_id: CurrentUserId, db: Client = Depends(get_db)):
    result = (
        db.table("assignments")
        .select("*")
        .eq("user_id", user_id)
        .order("due_date", desc=False)
        .execute()
    )
    return result.data


# ─── Create ──────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_assignment(
    payload: CreateAssignmentPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    if payload.difficulty not in DIFFICULTY_DELTA:
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, or hard")

    result = (
        db.table("assignments")
        .insert({
            "user_id":    user_id,
            "title":      payload.title,
            "subject":    payload.subject,
            "due_date":   payload.due_date,
            "difficulty": payload.difficulty,
        })
        .execute()
    )
    return result.data[0]


# ─── Update status ────────────────────────────────────────────────────────────

@router.patch("/{assignment_id}/status")
def update_status(
    assignment_id: UUID,
    payload: UpdateStatusPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    row = (
        db.table("assignments")
        .select("user_id, status")
        .eq("id", str(assignment_id))
        .maybe_single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if row.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your assignment")

    result = (
        db.table("assignments")
        .update({"status": payload.status})
        .eq("id", str(assignment_id))
        .select()
        .execute()
    )
    return result.data[0]


# ─── Complete ─────────────────────────────────────────────────────────────────

@router.patch("/{assignment_id}/complete")
def complete_assignment(
    assignment_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """Mark an assignment completed and award difficulty-scaled credibility."""
    row = (
        db.table("assignments")
        .select("user_id, status, difficulty, title")
        .eq("id", str(assignment_id))
        .maybe_single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if row.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    if row.data["status"] == "completed":
        raise HTTPException(status_code=400, detail="Assignment already completed")

    now = datetime.now(timezone.utc).isoformat()
    db.table("assignments").update({
        "status":       "completed",
        "completed_at": now,
    }).eq("id", str(assignment_id)).execute()

    delta = DIFFICULTY_DELTA[row.data["difficulty"]]
    from services.credibility_engine import award, CredReason
    award(
        db,
        user_id=user_id,
        delta=delta,
        reason=CredReason.MODULE_COMPLETED,
        reference_id=str(assignment_id),
    )

    return {
        "completed":           True,
        "credibility_awarded": delta,
        "message":             f"'{row.data['title']}' done! +{delta} credibility",
    }


# ─── Delete ──────────────────────────────────────────────────────────────────

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: UUID,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    row = (
        db.table("assignments")
        .select("user_id")
        .eq("id", str(assignment_id))
        .maybe_single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if row.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your assignment")

    db.table("assignments").delete().eq("id", str(assignment_id)).execute()
    return {"deleted": True}
