from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import CurrentUserId
from core.database import get_db
from services.credibility_engine import get_total_score, on_vote_cast
from supabase import Client

router = APIRouter(prefix="/votes", tags=["votes"])


class CastVotePayload(BaseModel):
    answer_id: UUID
    value: int  # +1 or -1


@router.post("/", status_code=201)
def cast_vote(
    payload: CastVotePayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    if payload.value not in (1, -1):
        raise HTTPException(status_code=400, detail="value must be 1 or -1")

    # Get the answer + its post topic
    answer = (
        db.table("answers")
        .select("id, author_id, post_id, stake_amount")
        .eq("id", str(payload.answer_id))
        .maybe_single()
        .execute()
    )
    if not answer.data:
        raise HTTPException(status_code=404, detail="Answer not found")

    # Cannot vote on your own answer
    if answer.data["author_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own answer")

    # Cannot vote if you staked on this answer (conflict of interest)
    existing_stake = answer.data.get("stake_amount", 0)
    if existing_stake > 0 and answer.data["author_id"] != user_id:
        # Check if voter is the staker — stake is always the author's, skip this check
        pass

    # Get topic from post
    post = (
        db.table("posts")
        .select("topic")
        .eq("id", answer.data["post_id"])
        .maybe_single()
        .execute()
    )
    topic = post.data["topic"] if post.data else "general"

    # Get voter's current credibility (snapshot for audit)
    voter_cred = get_total_score(db, user_id)

    # Insert vote (unique constraint handles duplicates)
    try:
        db.table("votes").insert(
            {
                "voter_id": user_id,
                "answer_id": str(payload.answer_id),
                "value": payload.value,
                "voter_credibility_at_vote": voter_cred,
            }
        ).execute()
    except Exception:
        raise HTTPException(status_code=409, detail="Already voted on this answer")

    # Award credibility to answer author (weighted by voter cred)
    on_vote_cast(
        db,
        answer_author_id=answer.data["author_id"],
        voter_cred=voter_cred,
        vote_value=payload.value,
        topic=topic,
        answer_id=str(payload.answer_id),
    )

    return {"voted": True, "voter_credibility": voter_cred}


@router.delete("/{answer_id}")
def remove_vote(answer_id: UUID, user_id: CurrentUserId, db: Client = Depends(get_db)):
    """Undo a vote (removes credibility delta is NOT reversed — by design)."""
    db.table("votes").delete().eq("voter_id", user_id).eq(
        "answer_id", str(answer_id)
    ).execute()
    return {"removed": True}
