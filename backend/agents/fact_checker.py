"""
AI Fact-Checker Agent

Runs as a background task after a post's answer is accepted.
Evaluates every non-accepted answer against:
  1. The accepted answer (ground truth chosen by the question author)
  2. UK financial RAG context (FCA, MoneyHelper, Gov.uk — already in Pinecone)

This is intentionally different from Reddit-style moderation:
  - It is AI-driven, not vote-driven — popularity cannot shield bad advice.
  - It uses authoritative UK financial sources, not community consensus.
  - High-credibility authors are not exempt; factual accuracy is the only measure.
  - A wrong-but-upvoted answer is still penalised.

Claude Haiku is used (same as RAG sentiment) — cheap, fast, JSON-constrained.
"""
import json

import anthropic

from core.config import settings
from services.credibility_engine import on_fact_check_fail, on_fact_check_pass
from services.rag import rag

_FACT_CHECK_PROMPT = """\
You are a UK student finance fact-checker. Evaluate the candidate answer against \
the accepted answer and the reference documents below.

Question: {question}

Accepted answer (ground truth):
{accepted}

Reference documents (UK financial guidance):
{docs}

Candidate answer to evaluate:
{candidate}

Reply with a single JSON object. No prose outside the JSON.

{{"verdict": "accurate" | "misleading" | "unverified", \
"confidence": <float 0.00-1.00>, \
"reason": "<max 20 words>", \
"correction": "<max 30 words or null>"}}

Definitions:
  accurate    = consistent with the accepted answer and/or references
  misleading  = factually wrong or dangerously incomplete in a way that could harm a UK student
  unverified  = insufficient evidence to judge — use this when uncertain
Never penalise for writing style, tone, or brevity — only for factual accuracy."""

_CONFIDENCE_THRESHOLD = 0.7


async def run_fact_checker(
    post_id: str,
    accepted_answer_id: str,
    db,
) -> None:
    """
    Background task: fact-check all non-accepted answers on a post.
    Updates fact_check_status/confidence/correction on each answer row
    and emits credibility events for clear verdicts.
    """
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # ── 1. Fetch post ────────────────────────────────────────────────────────
    post_result = (
        db.table("posts")
        .select("title, body, topic")
        .eq("id", post_id)
        .maybe_single()
        .execute()
    )
    if not post_result.data:
        print(f"[FactCheck] Post {post_id} not found — aborting.")
        return

    post = post_result.data
    question = f"{post['title']}\n\n{post['body']}"
    topic    = post["topic"]

    # ── 2. Fetch all answers ─────────────────────────────────────────────────
    answers_result = (
        db.table("answers_enriched")
        .select("id, author_id, content")
        .eq("post_id", post_id)
        .execute()
    )
    answers = answers_result.data or []

    # Separate accepted answer from candidates
    accepted_content = next(
        (a["content"] for a in answers if a["id"] == accepted_answer_id), None
    )
    candidates = [a for a in answers if a["id"] != accepted_answer_id]

    if not accepted_content or not candidates:
        print(f"[FactCheck] Nothing to check for post {post_id}.")
        return

    # ── 3. Fetch RAG context ─────────────────────────────────────────────────
    if rag.available():
        annotated = rag.get_context(query=question, topic=topic, top_k=4)
        docs_context = rag.format_for_advisor(annotated)
    else:
        docs_context = "(No reference documents available — UK finance stub mode)"

    # ── 4. Evaluate each candidate ───────────────────────────────────────────
    for answer in candidates:
        verdict, confidence, reason, correction = _evaluate(
            client=client,
            question=question,
            accepted=accepted_content,
            docs=docs_context,
            candidate=answer["content"],
        )

        # Write result back to the answers table
        db.table("answers").update(
            {
                "fact_check_status":     verdict,
                "fact_check_confidence": confidence,
                "fact_check_evidence":   reason,
                "fact_check_correction": correction,
            }
        ).eq("id", answer["id"]).execute()

        # Apply credibility consequences for confident verdicts
        if confidence >= _CONFIDENCE_THRESHOLD:
            if verdict == "misleading":
                on_fact_check_fail(
                    db,
                    answer_author_id=answer["author_id"],
                    topic=topic,
                    answer_id=answer["id"],
                )
                print(
                    f"[FactCheck] MISLEADING — penalised author {answer['author_id'][:8]}… "
                    f"(confidence={confidence:.0%})"
                )
            elif verdict == "accurate":
                on_fact_check_pass(
                    db,
                    answer_author_id=answer["author_id"],
                    topic=topic,
                    answer_id=answer["id"],
                )
                print(
                    f"[FactCheck] ACCURATE — rewarded author {answer['author_id'][:8]}… "
                    f"(confidence={confidence:.0%})"
                )
        else:
            print(
                f"[FactCheck] {verdict.upper()} but low confidence ({confidence:.0%}) "
                f"— no credibility change for {answer['author_id'][:8]}…"
            )


def _evaluate(
    *,
    client: anthropic.Anthropic,
    question: str,
    accepted: str,
    docs: str,
    candidate: str,
) -> tuple[str, float, str, str | None]:
    """
    Call Claude Haiku and return (verdict, confidence, reason, correction).
    Falls back to ('unverified', 0.0, 'evaluation failed', None) on any error.
    """
    prompt = _FACT_CHECK_PROMPT.format(
        question=question[:600],
        accepted=accepted[:600],
        docs=docs[:1200],
        candidate=candidate[:600],
    )
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        raw  = resp.content[0].text.strip()
        data = json.loads(raw)

        verdict    = data.get("verdict", "unverified")
        confidence = float(data.get("confidence", 0.0))
        reason     = str(data.get("reason", ""))[:200]
        correction = data.get("correction")

        if verdict not in ("accurate", "misleading", "unverified"):
            verdict = "unverified"

        return verdict, confidence, reason, correction

    except Exception as exc:
        print(f"[FactCheck] Claude evaluation failed: {exc}")
        return "unverified", 0.0, "evaluation failed", None
