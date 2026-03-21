from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.auth import CurrentUserId
from core.database import get_db
from supabase import Client

router = APIRouter(prefix="/answers", tags=["answers"])


class CreateAnswerPayload(BaseModel):
    post_id: UUID
    content: str = Field(..., min_length=10)
    stake_amount: int = Field(default=0, ge=0, le=200)


@router.post("/", status_code=201)
def create_answer(
    payload: CreateAnswerPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    # Verify post exists and isn't resolved
    post = (
        db.table("posts")
        .select("id, resolved, topic")
        .eq("id", str(payload.post_id))
        .maybe_single()
        .execute()
    )
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.data["resolved"]:
        raise HTTPException(status_code=400, detail="Post is already resolved")

    # If staking, verify user has enough credibility
    if payload.stake_amount > 0:
        from services.credibility_engine import get_total_score
        current_score = get_total_score(db, user_id)
        if current_score - payload.stake_amount < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient credibility to stake {payload.stake_amount} (you have {current_score})",
            )

    result = (
        db.table("answers")
        .insert(
            {
                "post_id": str(payload.post_id),
                "author_id": user_id,
                "content": payload.content,
                "stake_amount": payload.stake_amount,
            }
        )
        .execute()
    )
    return result.data[0]


@router.get("/post/{post_id}")
def get_answers_for_post(post_id: UUID, db: Client = Depends(get_db)):
    """Returns enriched answers sorted by author credibility."""
    result = (
        db.table("answers_enriched")
        .select("*")
        .eq("post_id", str(post_id))
        .order("author_total_cred", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{answer_id}")
def delete_answer(answer_id: UUID, user_id: CurrentUserId, db: Client = Depends(get_db)):
    answer = (
        db.table("answers")
        .select("author_id")
        .eq("id", str(answer_id))
        .maybe_single()
        .execute()
    )
    if not answer.data:
        raise HTTPException(status_code=404, detail="Answer not found")
    if answer.data["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's answer")

    db.table("answers").delete().eq("id", str(answer_id)).execute()
    return {"deleted": True}
