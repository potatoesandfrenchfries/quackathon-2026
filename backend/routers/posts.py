from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from core.auth import CurrentUserId
from core.database import get_db
from supabase import Client

router = APIRouter(prefix="/posts", tags=["posts"])

VALID_TOPICS = {"rent", "loans", "budgeting", "investing", "overdraft", "savings", "general"}


class CreatePostPayload(BaseModel):
    title: str = Field(..., min_length=10, max_length=300)
    body: str = Field(..., min_length=20)
    topic: str


class AcceptAnswerPayload(BaseModel):
    answer_id: UUID


@router.get("/")
def list_posts(
    topic: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 20,
    offset: int = 0,
    db: Client = Depends(get_db),
):
    query = (
        db.table("posts")
        .select(
            "*, profiles(username, display_name), "
            "answers(count), ai_responses(response_json)"
        )
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if topic:
        query = query.eq("topic", topic)
    if resolved is not None:
        query = query.eq("resolved", resolved)

    return query.execute().data


@router.get("/{post_id}")
def get_post(post_id: UUID, db: Client = Depends(get_db)):
    result = (
        db.table("posts")
        .select(
            "*, profiles(username, display_name), "
            "answers_enriched(*), ai_responses(response_json)"
        )
        .eq("id", str(post_id))
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found")

    # Sort answers by author credibility descending (for AI context weighting)
    post = result.data
    if post.get("answers_enriched"):
        post["answers_enriched"].sort(
            key=lambda a: a.get("author_total_cred", 0), reverse=True
        )

    # Bump view count (fire and forget)
    db.table("posts").update({"view_count": (result.data.get("view_count", 0) + 1)}).eq(
        "id", str(post_id)
    ).execute()

    return post


@router.post("/", status_code=201)
def create_post(
    payload: CreatePostPayload,
    background_tasks: BackgroundTasks,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    if payload.topic not in VALID_TOPICS:
        raise HTTPException(status_code=400, detail=f"Invalid topic. Choose from: {VALID_TOPICS}")

    result = (
        db.table("posts")
        .insert(
            {
                "author_id": user_id,
                "title": payload.title,
                "body": payload.body,
                "topic": payload.topic,
            }
        )
        .execute()
    )
    post = result.data[0]

    # Kick off AI advisor asynchronously
    background_tasks.add_task(_trigger_ai_advisor, post["id"], db)

    return post


@router.post("/{post_id}/accept-answer")
def accept_answer(
    post_id: UUID,
    payload: AcceptAnswerPayload,
    user_id: CurrentUserId,
    db: Client = Depends(get_db),
):
    """OP marks an answer as accepted — awards credibility to the answerer."""
    post = (
        db.table("posts")
        .select("author_id, topic, resolved")
        .eq("id", str(post_id))
        .maybe_single()
        .execute()
    )
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.data["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the OP can accept an answer")
    if post.data["resolved"]:
        raise HTTPException(status_code=400, detail="Post already resolved")

    answer = (
        db.table("answers")
        .select("author_id")
        .eq("id", str(payload.answer_id))
        .eq("post_id", str(post_id))
        .maybe_single()
        .execute()
    )
    if not answer.data:
        raise HTTPException(status_code=404, detail="Answer not found in this post")

    # Mark resolved + set accepted answer
    db.table("posts").update(
        {"resolved": True, "accepted_answer_id": str(payload.answer_id)}
    ).eq("id", str(post_id)).execute()

    # Award credibility (import here to avoid circular)
    from services.credibility_engine import on_answer_accepted
    on_answer_accepted(
        db,
        answer_author_id=answer.data["author_id"],
        topic=post.data["topic"],
        answer_id=str(payload.answer_id),
    )

    return {"accepted_answer_id": str(payload.answer_id), "resolved": True}


async def _trigger_ai_advisor(post_id: str, db: Client) -> None:
    """Background task: call the AI advisor agent after post creation."""
    try:
        from agents.advisor import run_advisor
        await run_advisor(post_id, db)
    except Exception as exc:
        # Never crash the request — AI is best-effort
        print(f"[AI Advisor] Failed for post {post_id}: {exc}")
