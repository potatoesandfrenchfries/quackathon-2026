"""
Tools router — instant AI-powered financial checks.
Three tools: grocery price check, purchase long-term value, investment return sanity check.
"""
import json
from typing import Any, Literal

import anthropic
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import CurrentUserId
from core.config import settings

router = APIRouter(prefix="/tools", tags=["tools"])

# ─── Claude prompt configs per tool ──────────────────────────────────────────

_GROCERY_SYSTEM = """You are Buddy, a UK student finance guide.
Evaluate whether a grocery item price is a good deal for a UK student.
Respond ONLY with valid JSON matching exactly this structure:
{
  "verdict": "good_deal" | "fair" | "overpriced",
  "headline": "<10-word verdict sentence>",
  "typical_range": "<typical UK supermarket price range for this item>",
  "tip": "<one concrete money-saving tip>",
  "confidence": <integer 0-100>,
  "disclaimer": "Prices vary by region and retailer."
}"""

_PURCHASE_SYSTEM = """You are Buddy, a UK student finance guide.
Evaluate whether a purchase is worth it long-term for a student.
Consider: total cost of ownership, depreciation, opportunity cost, alternatives.
Respond ONLY with valid JSON matching exactly this structure:
{
  "verdict": "worth_it" | "borderline" | "not_worth_it",
  "headline": "<10-word verdict sentence>",
  "long_term_cost": "<analysis of total cost and value over time>",
  "alternatives": "<cheaper or better alternatives to consider>",
  "tip": "<one actionable recommendation>",
  "confidence": <integer 0-100>,
  "disclaimer": "This is educational guidance only, not financial advice.",
  "real_world_note": null
}
real_world_note: if this purchase has a notable ethical or sustainability angle (e.g. fast fashion,
known poor labour practices, secondhand available, high carbon footprint) add ONE plain-English
peer-tone sentence. Otherwise null. Never preachy."""

_INVESTMENT_SYSTEM = """You are Buddy, a UK student finance guide.
Evaluate whether an investment's expected return is realistic for the UK market and suitable for a student.
Consider typical market returns, risk, and student-specific constraints (limited capital, short horizon).
Respond ONLY with valid JSON matching exactly this structure:
{
  "verdict": "realistic" | "optimistic" | "unrealistic",
  "headline": "<10-word verdict sentence>",
  "typical_return": "<what this investment type typically yields in the UK>",
  "risk_level": "low" | "medium" | "high" | "very_high",
  "suitability": "<is this suitable for a student with limited capital?>",
  "tip": "<one actionable recommendation>",
  "confidence": <integer 0-100>,
  "disclaimer": "Educational guidance only. Past returns do not guarantee future results.",
  "real_world_note": null
}
real_world_note: if an ESG/ethical fund alternative exists for this investment type, or if
there's a notable ethical concern (e.g. crypto energy use, fossil fuel exposure), add ONE
plain-English peer-tone sentence. Otherwise null."""

TOOL_CONFIGS: dict[str, dict] = {
    "grocery": {
        "system": _GROCERY_SYSTEM,
        "build": lambda i: (
            f"Item: {i.get('item', '')}\n"
            f"Price paid: £{i.get('price', '')}"
            + (f" per {i['unit']}" if i.get("unit") else "") + "\n"
            f"Context: {i.get('context', 'UK supermarket purchase')}"
        ),
    },
    "purchase": {
        "system": _PURCHASE_SYSTEM,
        "build": lambda i: (
            f"Purchase: {i.get('item', '')}\n"
            f"Price: £{i.get('price', '')}\n"
            f"Usage context: {i.get('context', '')}\n"
            f"Timeframe considering: {i.get('timeframe', 'not specified')}"
        ),
    },
    "investment": {
        "system": _INVESTMENT_SYSTEM,
        "build": lambda i: (
            f"Investment type: {i.get('investment_type', '')}\n"
            f"Expected annual return: {i.get('expected_return', '')}%\n"
            f"Amount considering: £{i.get('amount', '')}\n"
            f"Time horizon: {i.get('duration', '')} years"
        ),
    },
}


class CheckRequest(BaseModel):
    tool: Literal["grocery", "purchase", "investment"]
    inputs: dict[str, Any]


@router.post("/check")
async def check(
    payload: CheckRequest,
    _user_id: str = Depends(CurrentUserId),
):
    cfg = TOOL_CONFIGS[payload.tool]
    user_msg = cfg["build"](payload.inputs)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            system=cfg["system"],
            messages=[{"role": "user", "content": user_msg}],
        )
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse AI response",
            "raw": response.content[0].text,
        }
    except Exception as exc:
        return {"error": str(exc)}
