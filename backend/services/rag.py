"""
RAG (Retrieval-Augmented Generation) Service

Architecture — strict separation of concerns:
  1. Ingest  : fetch UK financial docs → embed (Pinecone inference) → store
  2. Retrieve: embed query → cosine search → return ranked chunks  ← no AI
  3. Sentiment: Claude Haiku classifies sentiment of each chunk    ← ONLY AI use

AI (Claude) is used exclusively for sentiment analysis of retrieved documents.
It does NOT summarise, answer, or generate content here.
"""
import json
from typing import Optional

import anthropic
from pinecone import Pinecone, ServerlessSpec

from core.config import settings
from services.document_sources import fetch_all

# Pinecone's hosted inference model — 1024-dim, multilingual
_EMBED_MODEL = "multilingual-e5-large"
_EMBED_DIM   = 1024

# Claude Haiku — cheapest model, used only for 1-token classification
_SENTIMENT_PROMPT = """\
Classify the sentiment of the following UK financial text relative to the topic "{topic}".

Definitions:
  positive = beneficial / favourable news for a student in the UK regarding this topic
  negative = costly / risky / alarming news for a student in the UK regarding this topic
  neutral  = factual / informational with no clear directional bias

Reply with a single JSON object. No prose outside the JSON.

{{"sentiment": "positive" | "negative" | "neutral", "score": <float 0.00-1.00>, "signal": "<max 8 words>"}}

Text:
{text}"""


class RAGService:
    """Singleton service — call `rag.ingest()` once at startup or via API."""

    def __init__(self) -> None:
        self._pc:    Optional[Pinecone]    = None
        self._index: Optional[object]      = None
        self._claude = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # ── Pinecone helpers ──────────────────────────────────────────────────────

    def _pinecone(self) -> Pinecone:
        if not self._pc:
            if not settings.pinecone_api_key:
                raise RuntimeError("PINECONE_API_KEY not configured")
            self._pc = Pinecone(api_key=settings.pinecone_api_key)
        return self._pc

    def _get_index(self):
        if self._index is None:
            pc   = self._pinecone()
            name = settings.pinecone_index_name
            existing = {idx.name for idx in pc.list_indexes()}
            if name not in existing:
                pc.create_index(
                    name=name,
                    dimension=_EMBED_DIM,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
                print(f"[RAG] Created Pinecone index '{name}' ({_EMBED_DIM}d, cosine)")
            self._index = pc.Index(name)
        return self._index

    def _embed(self, texts: list[str], input_type: str = "passage") -> list[list[float]]:
        """Embed texts using Pinecone's hosted inference endpoint."""
        pc = self._pinecone()
        result = pc.inference.embed(
            model=_EMBED_MODEL,
            inputs=texts,
            parameters={"input_type": input_type, "truncate": "END"},
        )
        return [r.values for r in result]

    # ── 1. Ingest ─────────────────────────────────────────────────────────────

    async def ingest(self) -> int:
        """
        Fetch all UK financial sources, embed them, and upsert into Pinecone.
        Returns total vectors written. No AI involved.
        """
        docs = await fetch_all()
        if not docs:
            return 0

        index      = self._get_index()
        batch_size = 32
        total      = 0

        for i in range(0, len(docs), batch_size):
            batch = docs[i: i + batch_size]
            try:
                embeddings = self._embed([d["text"] for d in batch], input_type="passage")
            except Exception as exc:
                print(f"[RAG] Embed batch {i} failed: {exc}")
                continue

            vectors = [
                {
                    "id":     d["id"],
                    "values": emb,
                    "metadata": {
                        "text":       d["text"][:900],   # Pinecone metadata limit
                        "source":     d["source"],
                        "url":        d["url"],
                        "topic":      d["topic"],
                        "fetched_at": d["fetched_at"],
                    },
                }
                for d, emb in zip(batch, embeddings)
            ]
            index.upsert(vectors=vectors)
            total += len(vectors)

        print(f"[RAG] Ingested {total} vectors into '{settings.pinecone_index_name}'")
        return total

    # ── 2. Retrieve ───────────────────────────────────────────────────────────

    def retrieve(self, query: str, topic: str, top_k: int = 6) -> list[dict]:
        """
        Embed the query and return the top-k most relevant document chunks.
        Pure vector search — no AI.
        """
        try:
            query_vec = self._embed([query], input_type="query")[0]
            index     = self._get_index()

            # Prioritise topic-matching docs; fall back to cross-topic if sparse
            topic_filter = {"topic": {"$in": [topic, "general"]}} if topic != "general" else None
            results = index.query(
                vector=query_vec,
                top_k=top_k,
                include_metadata=True,
                filter=topic_filter,
            )

            return [
                {
                    "score":  round(m.score, 4),
                    "text":   m.metadata["text"],
                    "source": m.metadata["source"],
                    "url":    m.metadata.get("url", ""),
                    "topic":  m.metadata.get("topic", "general"),
                }
                for m in results.matches
            ]
        except Exception as exc:
            print(f"[RAG] Retrieval failed: {exc}")
            return []

    # ── 3. Sentiment (only AI call in the RAG pipeline) ───────────────────────

    def analyze_sentiment(self, chunks: list[dict], topic: str) -> list[dict]:
        """
        Classify the sentiment of each retrieved chunk using Claude Haiku.

        This is the ONLY place AI is used in the RAG pipeline.
        Claude is given a strict JSON-only prompt — no summarisation, no generation.
        """
        annotated = []
        for chunk in chunks:
            prompt = _SENTIMENT_PROMPT.format(
                topic=topic,
                text=chunk["text"][:800],
            )
            try:
                resp = self._claude.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=60,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw  = resp.content[0].text.strip()
                data = json.loads(raw)
                # Validate expected keys
                if "sentiment" not in data:
                    raise ValueError("missing sentiment key")
            except Exception:
                data = {"sentiment": "neutral", "score": 0.5, "signal": "unclassified"}

            annotated.append({**chunk, **data})

        return annotated

    # ── Orchestrator ──────────────────────────────────────────────────────────

    def get_context(self, query: str, topic: str, top_k: int = 6) -> list[dict]:
        """
        Full RAG pipeline:
          retrieve (no AI) → sentiment analysis (Haiku only)
        Returns sentiment-annotated chunks sorted by retrieval score.
        """
        chunks = self.retrieve(query, topic, top_k)
        if not chunks:
            return []
        return self.analyze_sentiment(chunks, topic)

    def format_for_advisor(self, chunks: list[dict]) -> str:
        """Render annotated chunks as a compact context block for the advisor prompt."""
        if not chunks:
            return "No reference documents retrieved from index."

        icons = {"positive": "📈", "negative": "📉", "neutral": "📄"}
        lines = []
        for i, c in enumerate(chunks, 1):
            icon      = icons.get(c.get("sentiment", "neutral"), "📄")
            sentiment = c.get("sentiment", "neutral")
            score     = c.get("score", 0.0)
            signal    = c.get("signal", "")
            relevance = c.get("score", 0.0)
            lines.append(
                f"[Doc {i}] {icon} {c['source']}  "
                f"relevance={relevance:.2f}  sentiment={sentiment}({score:.0%})  signal: {signal}\n"
                f"{c['text'][:400]}"
            )
        return "\n\n".join(lines)

    def available(self) -> bool:
        """True if Pinecone is configured and reachable."""
        return bool(settings.pinecone_api_key)

    def index_stats(self) -> dict:
        try:
            stats = self._get_index().describe_index_stats()
            return {
                "vector_count": stats.total_vector_count,
                "dimension":    _EMBED_DIM,
                "model":        _EMBED_MODEL,
                "index":        settings.pinecone_index_name,
            }
        except Exception as exc:
            return {"error": str(exc)}


# Module-level singleton
rag = RAGService()
