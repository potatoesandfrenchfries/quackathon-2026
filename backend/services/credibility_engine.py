"""
Credibility Engine — single source of truth for all credibility mutations.

Rules:
- Only this module writes to credibility_events.
- All deltas are recorded with a reason + optional topic + optional reference_id.
- Call get_total_score() to read the current materialized score.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from supabase import Client

from core.config import settings


class CredReason(str, Enum):
    SIGNUP_BONUS = "signup_bonus"
    ANSWER_ACCEPTED = "answer_accepted"
    ANSWER_UPVOTED = "answer_upvoted"
    ANSWER_DOWNVOTED = "answer_downvoted"
    RESOURCE_SHARED = "resource_shared"
    STAKE_WON = "stake_won"
    STAKE_LOST = "stake_lost"
    FACT_CHECK_FAIL = "fact_check_fail"
    FACT_CHECK_PASS = "fact_check_pass"
    STREAK_BONUS = "streak_bonus"
    MODULE_COMPLETED = "module_completed"
    SPAM_PENALTY = "spam_penalty"
    INACTIVITY_DECAY = "inactivity_decay"


TOPIC_LABELS = {"rent", "loans", "budgeting", "investing", "overdraft", "savings", "general"}

TIERS = [
    (0,    "newcomer",    "#9ca3af"),  # gray-400
    (100,  "learner",     "#60a5fa"),  # blue-400
    (300,  "contributor", "#34d399"),  # emerald-400
    (600,  "trusted",     "#fbbf24"),  # amber-400
    (900,  "advisor",     "#a78bfa"),  # violet-400
    (1200, "oracle",      "#67e8f9"),  # cyan-300
]


@dataclass
class CredibilitySnapshot:
    user_id: str
    total_score: int
    tier: str
    tier_color: str
    topic_scores: dict[str, int]


def _tier_from_score(score: int) -> tuple[str, str]:
    label, color = "newcomer", "#9ca3af"
    for threshold, t_label, t_color in TIERS:
        if score >= threshold:
            label, color = t_label, t_color
    return label, color


def award(
    db: Client,
    *,
    user_id: str,
    delta: int,
    reason: CredReason,
    topic: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> dict:
    """Insert a single credibility event and return it."""
    if topic and topic not in TOPIC_LABELS:
        raise ValueError(f"Unknown topic: {topic}")

    row = {
        "user_id": user_id,
        "delta": delta,
        "reason": reason.value,
        "topic": topic,
        "reference_id": reference_id,
    }
    result = db.table("credibility_events").insert(row).execute()
    return result.data[0]


def get_total_score(db: Client, user_id: str) -> int:
    """Sum all deltas for a user from the view."""
    result = (
        db.table("user_total_credibility")
        .select("total_score")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data is None:
        return settings.signup_bonus  # brand-new user not yet in view
    return result.data["total_score"] or 0


def get_topic_score(db: Client, user_id: str, topic: str) -> int:
    result = (
        db.table("user_topic_credibility")
        .select("score")
        .eq("user_id", user_id)
        .eq("topic", topic)
        .maybe_single()
        .execute()
    )
    return result.data["score"] if result.data else 0


def get_snapshot(db: Client, user_id: str) -> CredibilitySnapshot:
    total = get_total_score(db, user_id)
    tier, color = _tier_from_score(total)

    topics_result = (
        db.table("user_topic_credibility")
        .select("topic, score")
        .eq("user_id", user_id)
        .execute()
    )
    topic_scores = {row["topic"]: row["score"] for row in (topics_result.data or [])}

    return CredibilitySnapshot(
        user_id=user_id,
        total_score=total,
        tier=tier,
        tier_color=color,
        topic_scores=topic_scores,
    )


# -----------------------------------------------------------------------
# Compound operations (called by routers after DB writes succeed)
# -----------------------------------------------------------------------

def on_answer_accepted(db: Client, *, answer_author_id: str, topic: str, answer_id: str) -> None:
    award(
        db,
        user_id=answer_author_id,
        delta=settings.answer_accepted_delta,
        reason=CredReason.ANSWER_ACCEPTED,
        topic=topic,
        reference_id=answer_id,
    )


def on_vote_cast(
    db: Client,
    *,
    answer_author_id: str,
    voter_cred: int,
    vote_value: int,  # +1 or -1
    topic: str,
    answer_id: str,
) -> None:
    """Apply a credibility-weighted vote delta to the answer's author."""
    weight = min(5.0, max(0.2, voter_cred / 350.0))
    if vote_value == 1:
        delta = max(1, round(settings.vote_up_base_delta * weight))
    else:
        delta = min(-1, round(settings.vote_down_base_delta * weight))

    award(
        db,
        user_id=answer_author_id,
        delta=delta,
        reason=CredReason.ANSWER_UPVOTED if vote_value == 1 else CredReason.ANSWER_DOWNVOTED,
        topic=topic,
        reference_id=answer_id,
    )


def on_fact_check_fail(
    db: Client, *, answer_author_id: str, topic: str, answer_id: str
) -> None:
    award(
        db,
        user_id=answer_author_id,
        delta=settings.fact_check_fail_delta,
        reason=CredReason.FACT_CHECK_FAIL,
        topic=topic,
        reference_id=answer_id,
    )


def on_fact_check_pass(
    db: Client, *, answer_author_id: str, topic: str, answer_id: str
) -> None:
    award(
        db,
        user_id=answer_author_id,
        delta=5,
        reason=CredReason.FACT_CHECK_PASS,
        topic=topic,
        reference_id=answer_id,
    )


def on_challenge_completed(db: Client, *, user_id: str, challenge_id: str) -> None:
    """Award credibility when a user completes a challenge."""
    award(
        db,
        user_id=user_id,
        delta=settings.challenge_completed_delta,
        reason=CredReason.MODULE_COMPLETED,
        reference_id=challenge_id,
    )


def on_goal_completed(db: Client, *, user_id: str, goal_id: str) -> None:
    """Award a small credibility boost when a personal savings goal is reached."""
    award(
        db,
        user_id=user_id,
        delta=10,
        reason=CredReason.MODULE_COMPLETED,
        reference_id=goal_id,
    )


def settle_stakes(
    db: Client,
    *,
    post_id: str,
    accepted_answer_id: str,
    topic: str,
) -> None:
    """
    Emit STAKE_WON / STAKE_LOST events for every answer that carried a stake.

    - Accepted answerer: +round(stake_amount * stake_win_multiplier)  [STAKE_WON]
    - Every other staker: -stake_amount                               [STAKE_LOST]

    Answers with stake_amount == 0 are ignored.
    """
    staked = (
        db.table("answers")
        .select("id, author_id, stake_amount")
        .eq("post_id", post_id)
        .gt("stake_amount", 0)
        .execute()
    )
    for answer in staked.data or []:
        if answer["id"] == accepted_answer_id:
            delta = round(answer["stake_amount"] * settings.stake_win_multiplier)
            reason = CredReason.STAKE_WON
        else:
            delta = -answer["stake_amount"]
            reason = CredReason.STAKE_LOST

        award(
            db,
            user_id=answer["author_id"],
            delta=delta,
            reason=reason,
            topic=topic,
            reference_id=answer["id"],
        )
