"""
Unit tests for RAGService pure methods.

No real Pinecone or Anthropic calls are made — both are mocked at the
class level. This keeps tests fast and free of API credentials.
"""
import json
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Fixture: RAGService with external clients mocked
# ---------------------------------------------------------------------------

@pytest.fixture
def rag():
    """RAGService with the Anthropic client stubbed at construction time."""
    with patch("services.rag.anthropic.Anthropic"):
        from services.rag import RAGService
        svc = RAGService()
    return svc


def _make_chunk(
    source="MoneyHelper",
    score=0.85,
    sentiment="neutral",
    signal="factual info",
    text="Student loan repayment threshold is £25,000.",
    topic="loans",
    url="",
) -> dict:
    return dict(source=source, score=score, sentiment=sentiment,
                signal=signal, text=text, topic=topic, url=url)


# ---------------------------------------------------------------------------
# format_for_advisor()
# ---------------------------------------------------------------------------

class TestFormatForAdvisor:
    def test_empty_input_returns_no_docs_message(self, rag):
        assert rag.format_for_advisor([]) == "No reference documents retrieved from index."

    def test_positive_sentiment_shows_up_chart_icon(self, rag):
        chunk = _make_chunk(sentiment="positive", signal="ISA rates rising", source="FCA")
        result = rag.format_for_advisor([chunk])
        assert "📈" in result

    def test_negative_sentiment_shows_down_chart_icon(self, rag):
        chunk = _make_chunk(sentiment="negative", signal="overdraft fees up")
        result = rag.format_for_advisor([chunk])
        assert "📉" in result

    def test_neutral_sentiment_shows_document_icon(self, rag):
        chunk = _make_chunk(sentiment="neutral")
        result = rag.format_for_advisor([chunk])
        assert "📄" in result

    def test_unknown_sentiment_defaults_to_document_icon(self, rag):
        chunk = _make_chunk(sentiment="unknown_value")
        result = rag.format_for_advisor([chunk])
        assert "📄" in result

    def test_source_name_appears_in_output(self, rag):
        chunk = _make_chunk(source="Bank of England")
        result = rag.format_for_advisor([chunk])
        assert "Bank of England" in result

    def test_signal_appears_in_output(self, rag):
        chunk = _make_chunk(signal="rates remain elevated")
        result = rag.format_for_advisor([chunk])
        assert "rates remain elevated" in result

    def test_multiple_chunks_numbered_sequentially(self, rag):
        chunks = [_make_chunk(source=f"Src{i}") for i in range(3)]
        result = rag.format_for_advisor(chunks)
        assert "[Doc 1]" in result
        assert "[Doc 2]" in result
        assert "[Doc 3]" in result

    def test_text_truncated_to_400_chars(self, rag):
        chunk = _make_chunk(text="A" * 1000)
        result = rag.format_for_advisor([chunk])
        # The doc text section must not contain more than 400 A's
        assert "A" * 401 not in result

    def test_relevance_score_present(self, rag):
        chunk = _make_chunk(score=0.92)
        result = rag.format_for_advisor([chunk])
        assert "0.92" in result


# ---------------------------------------------------------------------------
# available()
# ---------------------------------------------------------------------------

class TestAvailable:
    def test_false_when_no_pinecone_key(self, monkeypatch):
        monkeypatch.setattr("services.rag.settings.pinecone_api_key", "")
        with patch("services.rag.anthropic.Anthropic"):
            from services.rag import RAGService
            svc = RAGService()
        assert svc.available() is False

    def test_true_when_pinecone_key_set(self, monkeypatch):
        monkeypatch.setattr("services.rag.settings.pinecone_api_key", "pc-fake-key-123")
        with patch("services.rag.anthropic.Anthropic"):
            from services.rag import RAGService
            svc = RAGService()
        assert svc.available() is True


# ---------------------------------------------------------------------------
# analyze_sentiment()  — Claude Haiku mocked
# ---------------------------------------------------------------------------

class TestAnalyzeSentiment:
    def _set_claude_response(self, rag, text: str):
        rag._claude.messages.create.return_value.content = [MagicMock(text=text)]

    def test_valid_response_parsed_correctly(self, rag):
        self._set_claude_response(
            rag, '{"sentiment": "positive", "score": 0.9, "signal": "ISA rates up"}'
        )
        result = rag.analyze_sentiment([_make_chunk()], topic="savings")
        assert result[0]["sentiment"] == "positive"
        assert result[0]["score"] == 0.9
        assert result[0]["signal"] == "ISA rates up"

    def test_fallback_on_invalid_json(self, rag):
        self._set_claude_response(rag, "this is not json at all")
        result = rag.analyze_sentiment([_make_chunk()], topic="savings")
        assert result[0]["sentiment"] == "neutral"
        assert result[0]["score"] == 0.5

    def test_fallback_on_missing_sentiment_key(self, rag):
        self._set_claude_response(rag, '{"score": 0.8, "signal": "something"}')
        result = rag.analyze_sentiment([_make_chunk()], topic="loans")
        assert result[0]["sentiment"] == "neutral"

    def test_fallback_label_is_unclassified(self, rag):
        self._set_claude_response(rag, "bad json")
        result = rag.analyze_sentiment([_make_chunk()], topic="loans")
        assert result[0]["signal"] == "unclassified"

    def test_original_chunk_fields_preserved(self, rag):
        self._set_claude_response(
            rag, '{"sentiment": "negative", "score": 0.7, "signal": "fee hike"}'
        )
        chunk = _make_chunk(source="FCA", score=0.88, text="Banks raise fees.")
        result = rag.analyze_sentiment([chunk], topic="overdraft")
        assert result[0]["source"] == "FCA"
        assert result[0]["score"] == 0.88        # retrieval score preserved
        assert result[0]["text"] == "Banks raise fees."

    def test_all_chunks_annotated(self, rag):
        self._set_claude_response(
            rag, '{"sentiment": "neutral", "score": 0.5, "signal": "info"}'
        )
        chunks = [_make_chunk(source=f"Src{i}") for i in range(4)]
        result = rag.analyze_sentiment(chunks, topic="budgeting")
        assert len(result) == 4
        assert all("sentiment" in c for c in result)

    def test_claude_called_once_per_chunk(self, rag):
        self._set_claude_response(
            rag, '{"sentiment": "neutral", "score": 0.5, "signal": "info"}'
        )
        chunks = [_make_chunk() for _ in range(3)]
        rag.analyze_sentiment(chunks, topic="savings")
        assert rag._claude.messages.create.call_count == 3

    def test_exception_from_claude_falls_back_gracefully(self, rag):
        rag._claude.messages.create.side_effect = Exception("network error")
        result = rag.analyze_sentiment([_make_chunk()], topic="savings")
        assert result[0]["sentiment"] == "neutral"


# ---------------------------------------------------------------------------
# get_context() — orchestrator: retrieve → analyze_sentiment
# ---------------------------------------------------------------------------

class TestGetContext:
    def test_empty_retrieve_returns_empty(self, rag):
        rag.retrieve = MagicMock(return_value=[])
        result = rag.get_context(query="ISA savings", topic="savings")
        assert result == []
        rag.analyze_sentiment.assert_not_called() if hasattr(rag.analyze_sentiment, "assert_not_called") else None

    def test_non_empty_retrieve_passes_to_sentiment(self, rag):
        fake_chunks = [_make_chunk()]
        rag.retrieve = MagicMock(return_value=fake_chunks)
        rag.analyze_sentiment = MagicMock(return_value=fake_chunks)
        result = rag.get_context(query="overdraft", topic="overdraft")
        rag.analyze_sentiment.assert_called_once_with(fake_chunks, "overdraft")
        assert result == fake_chunks
