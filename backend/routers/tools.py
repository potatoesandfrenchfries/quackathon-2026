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

ETHICS SCORING RULES:
- ethics_score is always an integer 0-10. Never omit it.
  0-4: notable concerns (e.g. fast fashion, known poor labour conditions, high-carbon production)
  5-6: neutral / no strong signal either way
  7-8: positive (e.g. durable/repairable, fair-trade certified, secondhand, long lifespan)
  9-10: exemplary (certified B-corp, organic + fair labour, circular economy product)
- ethics_summary: 1-2 plain-English peer-tone sentences on why you gave that score. Never preachy.

VERDICT RULES WHEN user_values IS NON-EMPTY (see user message):
- If the user's declared values align well with the product's ethics AND ethics_score >= 7,
  you MAY upgrade the verdict by one step (borderline -> worth_it, not_worth_it -> borderline).
  Never jump not_worth_it -> worth_it in a single step if price exceeds 2x comparable alternatives.
- If you upgrade, reflect it in the headline (e.g. "Sustainable choice justifies the premium").

Respond ONLY with valid JSON matching exactly this structure:
{
  "verdict": "worth_it" | "borderline" | "not_worth_it",
  "headline": "<10-word verdict sentence>",
  "long_term_cost": "<analysis of total cost and value over time>",
  "alternatives": "<cheaper or better alternatives to consider>",
  "tip": "<one actionable recommendation>",
  "confidence": <integer 0-100>,
  "disclaimer": "This is educational guidance only, not financial advice.",
  "ethics_score": <integer 0-10>,
  "ethics_summary": "<1-2 sentences>"
}"""

_INVESTMENT_SYSTEM = """You are Buddy, a UK student finance guide.
Evaluate whether an investment's expected return is realistic for the UK market and suitable for a student.
Consider typical market returns, risk, and student-specific constraints (limited capital, short horizon).

ETHICS SCORING RULES:
- ethics_score is always an integer 0-10. Never omit it.
  0-4: notable concerns (e.g. heavy fossil fuel exposure, crypto energy consumption, arms/tobacco)
  5-6: neutral / mixed ESG profile
  7-8: generally responsible (e.g. diversified index with partial ESG screening)
  9-10: explicitly ESG-focused fund, green bonds, community investment
- ethics_summary: 1-2 plain-English peer-tone sentences on the ESG profile and any notable concern or benefit.

VERDICT RULES WHEN esg_preference IS true (see user message):
- If the investment has high ESG risk (crypto, individual fossil fuel stocks, arms), you MAY
  downgrade realistic -> optimistic to reflect full-cost thinking. Explain in the headline.
- If the investment has a strong ESG profile (ethics_score >= 8) and is otherwise borderline
  optimistic, you MAY upgrade it to realistic. Never upgrade an unrealistic return.

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
  "ethics_score": <integer 0-10>,
  "ethics_summary": "<1-2 sentences>"
}"""

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
            f"Timeframe considering: {i.get('timeframe', 'not specified')}\n"
            + (
                "User values: "
                + ", ".join(
                    v for v in i.get("user_values", [])
                    if v in {"sustainability", "fair_labour", "low_carbon", "secondhand_circular"}
                )
                + "\nApply the VERDICT RULES for user_values described in the system prompt."
                if i.get("user_values")
                else "User values: none declared"
            )
        ),
    },
    "investment": {
        "system": _INVESTMENT_SYSTEM,
        "build": lambda i: (
            f"Investment type: {i.get('investment_type', '')}\n"
            f"Expected annual return: {i.get('expected_return', '')}%\n"
            f"Amount considering: £{i.get('amount', '')}\n"
            f"Time horizon: {i.get('duration', '')} years\n"
            f"ESG preference: {'yes — apply ESG verdict rules from system prompt' if i.get('esg_preference') else 'no'}"
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
            max_tokens=700,
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
