"""
UK Financial Document Sources

Fetches research from public UK financial institutions. No AI involved here.
Sources: Bank of England, FCA, Gov.uk, MoneyHelper, MoneySavingExpert RSS.
"""
import asyncio
import re
from datetime import datetime, timezone
from html.parser import HTMLParser

import httpx

_HEADERS = {"User-Agent": "BuddyFinanceApp/1.0 (student-wellbeing; non-commercial)"}
_TIMEOUT = httpx.Timeout(12.0)


# ── HTML → plain text ─────────────────────────────────────────────────────────

class _TextExtractor(HTMLParser):
    _SKIP_TAGS = {"script", "style", "nav", "header", "footer", "aside", "noscript"}

    def __init__(self):
        super().__init__()
        self._buf: list[str] = []
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP_TAGS:
            self._depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP_TAGS and self._depth:
            self._depth -= 1

    def handle_data(self, data):
        if not self._depth:
            t = data.strip()
            if t:
                self._buf.append(t)

    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._buf)).strip()


def _html_to_text(html: str) -> str:
    p = _TextExtractor()
    p.feed(html)
    return p.text()


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, size: int = 350, overlap: int = 40) -> list[str]:
    """Split text into overlapping word-level chunks."""
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i: i + size]))
        i += size - overlap
    return chunks


def _doc(uid: str, text: str, source: str, url: str, topic: str) -> dict:
    return {
        "id": uid,
        "text": text,
        "source": source,
        "url": url,
        "topic": topic,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Sources ───────────────────────────────────────────────────────────────────

async def fetch_boe_pages(client: httpx.AsyncClient) -> list[dict]:
    """Bank of England monetary policy and base rate pages."""
    pages = [
        ("https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate", "savings"),
        ("https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/monetary-policy-summary", "investing"),
        ("https://www.bankofengland.co.uk/financial-stability", "investing"),
    ]
    docs = []
    for url, topic in pages:
        try:
            r = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT)
            text = _html_to_text(r.text)
            for i, chunk in enumerate(chunk_text(text)[:5]):
                docs.append(_doc(f"boe_{abs(hash(url))}_{i}", chunk, "Bank of England", url, topic))
        except Exception as exc:
            print(f"[Sources] BOE {url} failed: {exc}")
    return docs


async def fetch_fca_rss(client: httpx.AsyncClient) -> list[dict]:
    """FCA consumer news RSS feed."""
    url = "https://www.fca.org.uk/news/rss.xml"
    try:
        r = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        items = re.findall(
            r"<item>.*?<title>(.*?)</title>.*?<description>(.*?)</description>.*?</item>",
            r.text, re.DOTALL,
        )
        docs = []
        for title, desc in items[:12]:
            title = re.sub(r"<[^>]+>", "", title).strip()
            desc  = re.sub(r"<[^>]+>|<!\[CDATA\[|\]\]>", "", desc).strip()
            text  = f"{title}. {desc}"
            docs.append(_doc(f"fca_{abs(hash(title))}", text[:600], "FCA", "https://www.fca.org.uk/news", "general"))
        return docs
    except Exception as exc:
        print(f"[Sources] FCA RSS failed: {exc}")
        return []


async def fetch_mse_rss(client: httpx.AsyncClient) -> list[dict]:
    """MoneySavingExpert news RSS — broad UK personal finance coverage."""
    url = "https://www.moneysavingexpert.com/news/rss/"
    try:
        r = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT)
        items = re.findall(
            r"<item>.*?<title>(.*?)</title>.*?<description>(.*?)</description>.*?<link>(.*?)</link>.*?</item>",
            r.text, re.DOTALL,
        )
        docs = []
        for title, desc, link in items[:12]:
            title = re.sub(r"<[^>]+>|<!\[CDATA\[|\]\]>", "", title).strip()
            desc  = re.sub(r"<[^>]+>|<!\[CDATA\[|\]\]>", "", desc).strip()
            text  = f"{title}. {desc}"
            docs.append(_doc(
                f"mse_{abs(hash(title))}", text[:600],
                "MoneySavingExpert", link.strip(), "general",
            ))
        return docs
    except Exception as exc:
        print(f"[Sources] MSE RSS failed: {exc}")
        return []


async def fetch_govuk_pages(client: httpx.AsyncClient) -> list[dict]:
    """Gov.uk student finance and money guidance."""
    pages = [
        ("https://www.gov.uk/student-finance", "loans"),
        ("https://www.gov.uk/student-finance-repayments", "loans"),
        ("https://www.gov.uk/lifetime-isa", "savings"),
        ("https://www.gov.uk/apply-for-student-finance", "loans"),
    ]
    docs = []
    for url, topic in pages:
        try:
            r = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT)
            text = _html_to_text(r.text)
            for i, chunk in enumerate(chunk_text(text)[:4]):
                docs.append(_doc(f"govuk_{abs(hash(url))}_{i}", chunk, "Gov.uk", url, topic))
        except Exception as exc:
            print(f"[Sources] Gov.uk {url} failed: {exc}")
    return docs


async def fetch_moneyhelper_pages(client: httpx.AsyncClient) -> list[dict]:
    """MoneyHelper (formerly MAS) guidance articles."""
    pages = [
        ("https://www.moneyhelper.org.uk/en/everyday-money/budgeting/beginners-guide-to-managing-your-money", "budgeting"),
        ("https://www.moneyhelper.org.uk/en/homes/renting/tenants-rights-when-your-landlord-wants-you-to-leave", "rent"),
        ("https://www.moneyhelper.org.uk/en/savings/building-your-savings/savings-guide-for-beginners", "savings"),
        ("https://www.moneyhelper.org.uk/en/everyday-money/credit/overdrafts-explained", "overdraft"),
        ("https://www.moneyhelper.org.uk/en/investments/investing-beginners/beginners-guide-to-investing", "investing"),
    ]
    docs = []
    for url, topic in pages:
        try:
            r = await client.get(url, headers=_HEADERS, timeout=_TIMEOUT)
            text = _html_to_text(r.text)
            for i, chunk in enumerate(chunk_text(text)[:5]):
                docs.append(_doc(f"mh_{abs(hash(url))}_{i}", chunk, "MoneyHelper", url, topic))
        except Exception as exc:
            print(f"[Sources] MoneyHelper {url} failed: {exc}")
    return docs


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def fetch_all() -> list[dict]:
    """Fetch all sources concurrently. Returns deduplicated list of document chunks."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        results = await asyncio.gather(
            fetch_boe_pages(client),
            fetch_fca_rss(client),
            fetch_mse_rss(client),
            fetch_govuk_pages(client),
            fetch_moneyhelper_pages(client),
            return_exceptions=True,
        )

    docs: list[dict] = []
    seen: set[str] = set()
    for r in results:
        if isinstance(r, list):
            for doc in r:
                if doc["id"] not in seen:
                    seen.add(doc["id"])
                    docs.append(doc)

    print(f"[Sources] Fetched {len(docs)} unique chunks from {len(results)} sources")
    return docs
