from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import get_db
from routers import auth, posts, answers, votes, credibility, tools, rag, challenges, goals


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    scheduler = AsyncIOScheduler(timezone="UTC")

    # Daily inactivity decay — runs at midnight UTC
    from services.decay import run_decay_job
    db = next(get_db())
    scheduler.add_job(
        run_decay_job,
        trigger="cron",
        hour=0,
        minute=0,
        args=[db],
        id="inactivity_decay",
        replace_existing=True,
    )

    scheduler.start()
    print("[Scheduler] Started — inactivity decay job registered (daily 00:00 UTC).")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    print("[Scheduler] Stopped.")


app = FastAPI(
    title="Buddy API",
    description="Student financial well-being platform — credibility as currency",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(answers.router)
app.include_router(votes.router)
app.include_router(credibility.router)
app.include_router(tools.router)
app.include_router(rag.router)
app.include_router(challenges.router)
app.include_router(goals.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
