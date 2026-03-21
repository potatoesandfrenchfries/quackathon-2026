from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth, posts, answers, votes, credibility, tools, rag

app = FastAPI(
    title="Buddy API",
    description="Student financial well-being platform — credibility as currency",
    version="0.1.0",
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


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
