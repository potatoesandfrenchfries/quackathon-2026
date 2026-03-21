"""
RAG router — ingestion trigger and retrieval endpoints.
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from services.rag import rag

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/ingest", summary="Trigger background ingestion of UK financial sources")
async def ingest(background_tasks: BackgroundTasks):
    if not rag.available():
        raise HTTPException(503, "Pinecone not configured (PINECONE_API_KEY missing)")
    background_tasks.add_task(rag.ingest)
    return {"status": "ingestion started", "note": "runs in background — check /rag/status"}


@router.get("/retrieve", summary="Retrieve and sentiment-tag chunks for a query")
async def retrieve(
    query: str,
    topic: str = Query("general"),
    top_k: int = Query(6, ge=1, le=20),
):
    if not rag.available():
        raise HTTPException(503, "Pinecone not configured")
    chunks = rag.retrieve(query, topic, top_k)
    annotated = rag.analyze_sentiment(chunks, topic)
    return {
        "query":   query,
        "topic":   topic,
        "results": annotated,
    }


@router.get("/status", summary="Pinecone index stats")
async def status():
    if not rag.available():
        return {"status": "disabled", "reason": "PINECONE_API_KEY not set"}
    return {"status": "ok", **rag.index_stats()}
