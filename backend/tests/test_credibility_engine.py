"""
Unit tests for the credibility engine.

All tests are pure-logic (no network, no DB).
The Supabase client is replaced with a MagicMock throughout.
"""
import pytest
from unittest.mock import MagicMock, call

from services.credibility_engine import (
    CredReason,
    _tier_from_score,
    award,
    on_answer_accepted,
    on_fact_check_fail,
    on_fact_check_pass,
    on_vote_cast,
)
from core.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db(returned_row: dict | None = None):
    """Return a MagicMock Supabase client whose insert returns `returned_row`."""
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value.data = (
        [returned_row] if returned_row else [{"id": "fake-id"}]
    )
    return db


def _last_inserted_row(db: MagicMock) -> dict:
    """Extract the row dict passed to the most recent .insert() call."""
    return db.table.return_value.insert.call_args[0][0]


# ---------------------------------------------------------------------------
# _tier_from_score
# ---------------------------------------------------------------------------

class TestTierFromScore:
    def test_zero_is_newcomer(self):
        tier, _ = _tier_from_score(0)
        assert tier == "newcomer"

    def test_99_is_still_newcomer(self):
        tier, _ = _tier_from_score(99)
        assert tier == "newcomer"

    def test_100_is_learner(self):
        tier, _ = _tier_from_score(100)
        assert tier == "learner"

    def test_299_is_learner(self):
        tier, _ = _tier_from_score(299)
        assert tier == "learner"

    def test_300_is_contributor(self):
        tier, _ = _tier_from_score(300)
        assert tier == "contributor"

    def test_600_is_trusted(self):
        tier, _ = _tier_from_score(600)
        assert tier == "trusted"

    def test_900_is_advisor(self):
        tier, _ = _tier_from_score(900)
        assert tier == "advisor"

    def test_1200_is_oracle(self):
        tier, _ = _tier_from_score(1200)
        assert tier == "oracle"

    def test_above_1200_stays_oracle(self):
        tier, _ = _tier_from_score(99999)
        assert tier == "oracle"

    def test_each_tier_has_a_color(self):
        for score in [0, 100, 300, 600, 900, 1200]:
            _, color = _tier_from_score(score)
            assert color.startswith("#"), f"Expected hex color at score={score}, got {color!r}"


# ---------------------------------------------------------------------------
# award()
# ---------------------------------------------------------------------------

class TestAward:
    def test_inserts_correct_fields(self):
        db = _mock_db({"id": "ev1", "user_id": "u1", "delta": 100, "reason": "signup_bonus"})
        result = award(db, user_id="u1", delta=100, reason=CredReason.SIGNUP_BONUS)

        row = _last_inserted_row(db)
        assert row["user_id"] == "u1"
        assert row["delta"] == 100
        assert row["reason"] == "signup_bonus"
        assert row["topic"] is None
        assert row["reference_id"] is None

    def test_returns_inserted_row(self):
        db = _mock_db({"id": "ev2", "delta": 15})
        result = award(db, user_id="u2", delta=15, reason=CredReason.ANSWER_ACCEPTED)
        assert result["id"] == "ev2"

    def test_raises_for_unknown_topic(self):
        db = _mock_db()
        with pytest.raises(ValueError, match="Unknown topic"):
            award(db, user_id="u1", delta=5, reason=CredReason.ANSWER_UPVOTED, topic="crypto")

    def test_accepts_all_valid_topics(self):
        valid_topics = {"rent", "loans", "budgeting", "investing", "overdraft", "savings", "general"}
        for topic in valid_topics:
            db = _mock_db()
            award(db, user_id="u1", delta=5, reason=CredReason.ANSWER_UPVOTED, topic=topic)

    def test_topic_none_is_allowed(self):
        db = _mock_db()
        award(db, user_id="u1", delta=100, reason=CredReason.SIGNUP_BONUS, topic=None)
        row = _last_inserted_row(db)
        assert row["topic"] is None

    def test_reference_id_stored(self):
        db = _mock_db()
        award(db, user_id="u1", delta=15, reason=CredReason.ANSWER_ACCEPTED, reference_id="ans-99")
        row = _last_inserted_row(db)
        assert row["reference_id"] == "ans-99"


# ---------------------------------------------------------------------------
# on_answer_accepted()
# ---------------------------------------------------------------------------

class TestOnAnswerAccepted:
    def test_awards_correct_reason(self):
        db = _mock_db()
        on_answer_accepted(db, answer_author_id="u1", topic="loans", answer_id="a1")
        row = _last_inserted_row(db)
        assert row["reason"] == CredReason.ANSWER_ACCEPTED.value

    def test_awards_configured_delta(self):
        db = _mock_db()
        on_answer_accepted(db, answer_author_id="u1", topic="savings", answer_id="a1")
        row = _last_inserted_row(db)
        assert row["delta"] == settings.answer_accepted_delta

    def test_stores_answer_id_as_reference(self):
        db = _mock_db()
        on_answer_accepted(db, answer_author_id="u1", topic="rent", answer_id="answer-xyz")
        row = _last_inserted_row(db)
        assert row["reference_id"] == "answer-xyz"


# ---------------------------------------------------------------------------
# on_vote_cast() — weight formula: min(5.0, max(0.2, voter_cred / 350.0))
# ---------------------------------------------------------------------------

class TestOnVoteCast:
    def _cast(self, voter_cred: int, vote_value: int) -> int:
        db = _mock_db()
        on_vote_cast(
            db,
            answer_author_id="author",
            voter_cred=voter_cred,
            vote_value=vote_value,
            topic="budgeting",
            answer_id="a1",
        )
        return _last_inserted_row(db)["delta"]

    # --- upvote ---

    def test_upvote_delta_at_least_1(self):
        assert self._cast(voter_cred=0, vote_value=1) >= 1

    def test_upvote_floor_weight_0_2(self):
        # weight = max(0.2, 0/350) = 0.2 → delta = max(1, round(3 * 0.2)) = max(1,1) = 1
        expected = max(1, round(settings.vote_up_base_delta * 0.2))
        assert self._cast(voter_cred=0, vote_value=1) == expected

    def test_upvote_weight_cap_at_5(self):
        # voter_cred=100_000 → weight = min(5.0, ...) = 5.0
        expected = max(1, round(settings.vote_up_base_delta * 5.0))
        assert self._cast(voter_cred=100_000, vote_value=1) == expected

    def test_upvote_reason_is_upvoted(self):
        db = _mock_db()
        on_vote_cast(db, answer_author_id="a", voter_cred=350, vote_value=1,
                     topic="loans", answer_id="x")
        assert _last_inserted_row(db)["reason"] == CredReason.ANSWER_UPVOTED.value

    def test_higher_credibility_voter_gives_more_on_upvote(self):
        low  = self._cast(voter_cred=70,   vote_value=1)   # weight ~0.2
        high = self._cast(voter_cred=1750, vote_value=1)   # weight = 5.0
        assert high > low

    # --- downvote ---

    def test_downvote_delta_at_most_minus_1(self):
        assert self._cast(voter_cred=0, vote_value=-1) <= -1

    def test_downvote_floor_weight_0_2(self):
        expected = min(-1, round(settings.vote_down_base_delta * 0.2))
        assert self._cast(voter_cred=0, vote_value=-1) == expected

    def test_downvote_weight_cap_at_5(self):
        expected = min(-1, round(settings.vote_down_base_delta * 5.0))
        assert self._cast(voter_cred=100_000, vote_value=-1) == expected

    def test_downvote_reason_is_downvoted(self):
        db = _mock_db()
        on_vote_cast(db, answer_author_id="a", voter_cred=350, vote_value=-1,
                     topic="loans", answer_id="x")
        assert _last_inserted_row(db)["reason"] == CredReason.ANSWER_DOWNVOTED.value

    def test_weight_exactly_1_at_350_cred(self):
        # voter_cred=350 → weight = 350/350 = 1.0
        expected_up   = max(1, round(settings.vote_up_base_delta   * 1.0))
        expected_down = min(-1, round(settings.vote_down_base_delta * 1.0))
        assert self._cast(voter_cred=350, vote_value=1)  == expected_up
        assert self._cast(voter_cred=350, vote_value=-1) == expected_down


# ---------------------------------------------------------------------------
# on_fact_check_fail / on_fact_check_pass
# ---------------------------------------------------------------------------

class TestFactCheck:
    def test_fail_applies_negative_delta(self):
        db = _mock_db()
        on_fact_check_fail(db, answer_author_id="u1", topic="investing", answer_id="a1")
        row = _last_inserted_row(db)
        assert row["delta"] == settings.fact_check_fail_delta
        assert row["delta"] < 0
        assert row["reason"] == CredReason.FACT_CHECK_FAIL.value

    def test_pass_applies_positive_delta(self):
        db = _mock_db()
        on_fact_check_pass(db, answer_author_id="u1", topic="investing", answer_id="a1")
        row = _last_inserted_row(db)
        assert row["delta"] > 0
        assert row["reason"] == CredReason.FACT_CHECK_PASS.value

    def test_fail_stores_reference_id(self):
        db = _mock_db()
        on_fact_check_fail(db, answer_author_id="u1", topic="savings", answer_id="ans-42")
        assert _last_inserted_row(db)["reference_id"] == "ans-42"
