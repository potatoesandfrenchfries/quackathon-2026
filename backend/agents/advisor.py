"""
AI Advisor Agent — runs after a new post is created.

Flow:
1. Fetch post + any existing answers (enriched with credibility)
2. Fetch user financial snapshot
3. RAG: retrieve relevant docs from Pinecone
4. Call Claude with credibility-weighted context
5. Cache response in ai_responses table
"""
import json
from typing import Optional

import anthropic

from core.config import settings

SYSTEM_PROMPT = """You are Buddy, a peer financial guide for students in the UK.
You are NOT a regulated financial advisor. Always frame your guidance as educational.

You will receive:
- A student's financial question
- Community answers sorted by author credibility (highest first)
- The student's financial snapshot
- Relevant reference documents

Your response MUST be valid JSON with this exact structure:
{
  "summary": "2-3 sentence summary of the community consensus",
  "action": "One clear, specific action the student should take",
  "confidence": <integer 0-100>,
  "top_source_username": "<username of the most credible answerer you weighted>",
  "top_source_cred": <their credibility score>,
  "reasoning": "Why you weighted that source most heavily",
  "disclaimer": "This is educational guidance only, not regulated financial advice.",
  "resources": ["<url or resource name>"]
}

Key rules:
- Explicitly mention credibility scores when citing community answers
- If no community answers exist, base response only on reference docs + financial snapshot
- Confidence should reflect how certain the guidance is (< 50 if conflicting answers)
- Be concrete: give numbers, thresholds, and specific next steps
"""


async def run_advisor(post_id: str, db) -> Optional[dict]:
    """Main entry point. Returns the response dict or None on failure."""
    # 1. Fetch post
    post_result = (
        db.table("posts")
        .select("*, profiles(username, financial_snapshot)")
        .eq("id", post_id)
        .maybe_single()
        .execute()
    )
    if not post_result.data:
        return None

    post = post_result.data

    # 2. Fetch enriched answers sorted by author credibility
    answers_result = (
        db.table("answers_enriched")
        .select("*")
        .eq("post_id", post_id)
        .order("author_total_cred", desc=True)
        .limit(10)
        .execute()
    )
    answers = answers_result.data or []

    # 3. Build context string
    user_snapshot = post.get("profiles", {}).get("financial_snapshot", {})
    answers_context = _format_answers(answers)

    # 4. RAG (stub for hackathon — replace with Pinecone call)
    docs_context = _stub_rag(post["topic"])

    # 5. Call Claude
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_message = f"""
QUESTION: {post['title']}

{post['body']}

STUDENT'S FINANCIAL SNAPSHOT:
{json.dumps(user_snapshot, indent=2) if user_snapshot else "Not provided"}

COMMUNITY ANSWERS (sorted by author credibility, highest first):
{answers_context if answers_context else "No community answers yet."}

REFERENCE DOCUMENTS:
{docs_context}
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text

        # Parse JSON response
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: wrap raw text
        parsed = {
            "summary": raw[:500],
            "action": "Please review the community answers above.",
            "confidence": 40,
            "disclaimer": "This is educational guidance only, not regulated financial advice.",
            "resources": [],
        }
    except Exception as exc:
        print(f"[Advisor Agent] Claude call failed: {exc}")
        return None

    # 6. Cache in DB
    try:
        db.table("ai_responses").upsert(
            {
                "post_id": post_id,
                "response_json": parsed,
                "model_used": "claude-sonnet-4-6",
            },
            on_conflict="post_id",
        ).execute()
    except Exception as exc:
        print(f"[Advisor Agent] DB cache failed: {exc}")

    return parsed


def _format_answers(answers: list[dict]) -> str:
    if not answers:
        return ""
    lines = []
    for i, a in enumerate(answers, 1):
        username = a.get("author_username", "unknown")
        total_cred = a.get("author_total_cred", 0)
        topic_cred = a.get("author_topic_cred", 0)
        vote_total = a.get("vote_total", 0)
        fact_status = a.get("fact_check_status", "pending")

        lines.append(
            f"Answer #{i} — @{username} "
            f"(Total credibility: {total_cred}, Topic credibility: {topic_cred}, "
            f"Votes: {vote_total:+d}, Fact-check: {fact_status})\n"
            f"{a['content']}\n"
        )
    return "\n---\n".join(lines)


def _stub_rag(topic: str) -> str:
    """
    Stub RAG for hackathon. Replace with actual Pinecone query.
    Returns hard-coded reference snippets per topic.
    """
    stubs = {
        "rent": (
            "MoneyHelper UK: Spending more than 35% of take-home pay on rent is considered "
            "financially risky. In London, 40-50% is common but leaves little buffer. "
            "Always factor in council tax, utilities (~£100-150/month), and commute costs."
        ),
        "loans": (
            "Gov.uk Student Finance: UK student loans are income-contingent — repayments only "
            "start when you earn above the threshold (£25,000 for Plan 2). "
            "Interest accrues from day 1 of study. Loans do NOT affect your credit score."
        ),
        "budgeting": (
            "MoneyHelper: The 50/30/20 rule — 50% needs, 30% wants, 20% savings/debt. "
            "For students on tight budgets, try 60/20/20. Track every spend for 30 days first."
        ),
        "overdraft": (
            "FCA guidance: Student overdrafts are often 0% interest up to a limit. "
            "Never use a fee-charging overdraft for day-to-day spending. "
            "Switch to a 0% student account if you haven't — Nationwide, Santander, and "
            "HSBC offer £1,000-£1,500 0% overdrafts."
        ),
        "investing": (
            "FCA: Before investing, build a 3-month emergency fund. "
            "Stocks & Shares ISA: £20,000 annual allowance, gains tax-free. "
            "Index funds (e.g., Vanguard FTSE All-World) are recommended for beginners — "
            "low cost, diversified. Never invest money you can't afford to lose for 5+ years."
        ),
        "savings": (
            "MoneyHelper: Start with a Lifetime ISA (LISA) if aged 18-39 — government adds "
            "25% bonus up to £1,000/year. Easy-access savings accounts: check MoneySavingExpert "
            "for best rates. Aim for £500-£1,000 emergency fund before anything else."
        ),
    }
    return stubs.get(topic, "No specific reference documents available for this topic.")
