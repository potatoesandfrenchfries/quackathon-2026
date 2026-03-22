"""
Inactivity Decay Service

Linear credibility decay for users who haven't engaged in over
`settings.decay_grace_days` days. Called once per day by the APScheduler job
registered in main.py.

Rules:
- Only non-decay events reset the inactivity clock (decay events don't count).
- Users at 0 credibility are skipped — score never goes below 0.
- One INACTIVITY_DECAY event is inserted per eligible user per run.
"""
from datetime import datetime, timezone

from supabase import Client

from core.config import settings
from services.credibility_engine import CredReason, award


async def run_decay_job(db: Client) -> None:
    """
    Find every user whose last *non-decay* credibility event is older than
    `decay_grace_days` days, then deduct `decay_daily_rate` points (floored at 0).
    """
    print(f"[Decay] Starting inactivity decay job at {datetime.now(timezone.utc).isoformat()}")

    # Users whose last meaningful activity is beyond the grace window.
    # We exclude inactivity_decay events so they don't reset the clock.
    grace_days = settings.decay_grace_days
    cutoff_result = db.rpc(
        "get_inactive_users",
        {"grace_days": grace_days},
    ).execute()

    # Fallback: if the RPC doesn't exist yet, query via the table API.
    # This raw approach works for a hackathon without a custom Postgres function.
    if cutoff_result.data is None:
        cutoff_result = _query_inactive_users_fallback(db, grace_days)

    inactive_users: list[dict] = cutoff_result.data or []

    if not inactive_users:
        print("[Decay] No inactive users found.")
        return

    # Cross-reference with current scores — skip users already at 0.
    scores_result = db.table("user_total_credibility").select("user_id, total_score").execute()
    score_map: dict[str, int] = {
        row["user_id"]: row["total_score"]
        for row in (scores_result.data or [])
    }

    applied = 0
    for row in inactive_users:
        user_id = row["user_id"]
        current = score_map.get(user_id, 0)
        if current <= 0:
            continue

        delta = -min(settings.decay_daily_rate, current)  # never go below 0
        award(
            db,
            user_id=user_id,
            delta=delta,
            reason=CredReason.INACTIVITY_DECAY,
        )
        applied += 1

    print(f"[Decay] Applied decay to {applied} user(s).")


def _query_inactive_users_fallback(db: Client, grace_days: int) -> object:
    """
    Direct table query fallback: returns users with no non-decay event
    in the last `grace_days` days.

    Uses Supabase's PostgREST filtering — equivalent to:
        SELECT DISTINCT user_id FROM credibility_events
        WHERE reason != 'inactivity_decay'
        GROUP BY user_id
        HAVING MAX(created_at) < NOW() - INTERVAL '{grace_days} days'
    """
    from datetime import timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(days=grace_days)).isoformat()

    # Fetch all non-decay events and compute last-active in Python.
    # Acceptable at hackathon scale; replace with a DB function for production.
    all_events = (
        db.table("credibility_events")
        .select("user_id, created_at")
        .neq("reason", "inactivity_decay")
        .execute()
    )

    last_active: dict[str, str] = {}
    for event in all_events.data or []:
        uid = event["user_id"]
        ts  = event["created_at"]
        if uid not in last_active or ts > last_active[uid]:
            last_active[uid] = ts

    inactive = [
        {"user_id": uid}
        for uid, ts in last_active.items()
        if ts < cutoff
    ]

    # Mimic the shape of a Supabase response object
    class _FakeResult:
        data = inactive

    return _FakeResult()
