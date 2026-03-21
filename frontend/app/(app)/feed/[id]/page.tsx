"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
} from "lucide-react";
import { fetchPost, createAnswer } from "@/lib/supabase/posts";
import { castVote } from "@/lib/supabase/posts";
import { CredibilityBadge, tierFromScore } from "@/components/CredibilityBadge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Post, AnswerEnriched, AIResponse, Topic } from "@/types/database";

const TOPIC_COLORS: Record<Topic, string> = {
  rent: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  loans: "bg-purple-400/10 text-purple-400 border-purple-400/30",
  budgeting: "bg-green-400/10 text-green-400 border-green-400/30",
  investing: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  overdraft: "bg-red-400/10 text-red-400 border-red-400/30",
  savings: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  general: "bg-gray-400/10 text-gray-400 border-gray-400/30",
};

// ─── AI Advisor Card ──────────────────────────────────────────────────────────

function AIAdvisorCard({
  ai,
  answerCount,
}: {
  ai: AIResponse;
  answerCount: number;
}) {
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              Buddy AI Advisor
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Synthesised from {answerCount} community answer
              {answerCount !== 1 ? "s" : ""}, weighted by topic credibility
              {ai.top_source_username && (
                <> · top source: <span className="text-gray-300">@{ai.top_source_username}</span>
                  {ai.top_source_cred != null && (
                    <span className="text-amber-400/70"> ({ai.top_source_cred} pts)</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Confidence pill */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="font-mono text-xs text-amber-400 font-bold">
            {Math.round(ai.confidence * (ai.confidence <= 1 ? 100 : 1))}% confidence
          </span>
          <div className="w-24 h-1.5 rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{
                width: `${Math.round(
                  ai.confidence * (ai.confidence <= 1 ? 100 : 1)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-gray-100 leading-relaxed">{ai.summary}</p>

        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400/70 mb-0.5">
            Recommended Action
          </p>
          <p className="text-amber-300 font-semibold">{ai.action}</p>
        </div>

        {ai.reasoning && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
              Why this source was weighted most
            </p>
            <p className="text-sm text-gray-400">{ai.reasoning}</p>
          </div>
        )}

        {ai.resources && ai.resources.length > 0 && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
              Resources
            </p>
            <ul className="space-y-1">
              {ai.resources.map((r, i) => (
                <li key={i} className="text-sm text-amber-400/80 hover:text-amber-400 transition-colors">
                  → {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-600 italic border-t border-gray-800 pt-3">
          {ai.disclaimer}
        </p>
      </div>
    </div>
  );
}

function AIAdvisorLoading() {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
            Buddy AI Advisor
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Researching current UK financial data…
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Answer Card ──────────────────────────────────────────────────────────────

function AnswerCard({
  answer,
  isAccepted,
  onVote,
  postTopic,
}: {
  answer: AnswerEnriched;
  isAccepted: boolean;
  onVote: (answerId: string, value: 1 | -1) => void;
  postTopic: Topic;
}) {
  const tier = tierFromScore(answer.author_total_cred);

  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-4 transition-colors",
        isAccepted
          ? "border-green-400/30 bg-green-400/5"
          : "border-gray-800 bg-gray-900"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 flex-wrap">
          {isAccepted && (
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-200">
                {answer.author_display_name || answer.author_username}
              </span>
              <CredibilityBadge
                score={answer.author_total_cred}
                tier={tier}
                size="sm"
                showLabel
              />
              {/* Staking badge */}
              {(answer as any).stake_amount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400">
                  <Lock className="h-2.5 w-2.5" />
                  {(answer as any).stake_amount} pts staked
                </span>
              )}
            </div>
            {/* Topic-specific credibility — the number that actually matters */}
            {answer.author_topic_cred != null && answer.author_topic_cred > 0 && (
              <p className="text-[10px] text-amber-400/60 mt-0.5">
                {answer.author_topic_cred} pts in {postTopic}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-600 shrink-0">
          {formatRelativeTime(answer.created_at)}
        </span>
      </div>

      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
        {answer.content}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onVote(answer.id, 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-green-400 hover:bg-green-400/10 transition-colors"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{answer.vote_total > 0 ? `+${answer.vote_total}` : answer.vote_total}</span>
          </button>
          <button
            onClick={() => onVote(answer.id, -1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {answer.fact_check_status !== "pending" && (
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
              answer.fact_check_status === "accurate"
                ? "text-green-400 bg-green-400/10 border-green-400/30"
                : answer.fact_check_status === "misleading"
                ? "text-red-400 bg-red-400/10 border-red-400/30"
                : "text-gray-500 bg-gray-500/10 border-gray-700"
            )}
          >
            {answer.fact_check_status}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<(Post & { answers_enriched: AnswerEnriched[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Advisor state — separate from post so it can load independently
  const [advisorResponse, setAdvisorResponse] = useState<AIResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  const [newAnswer, setNewAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost(postId)
      .then((postData) => {
        setPost(postData);
        // If DB already has a cached AI response, use it immediately
        const cached = postData.ai_responses?.response_json ?? null;
        if (cached) {
          setAdvisorResponse(cached as unknown as AIResponse);
        } else {
          // Otherwise kick off the advisor (with web research)
          setAdvisorLoading(true);
          fetch("/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
          })
            .then((r) => r.json())
            .then((ai) => {
              if (!ai.error) setAdvisorResponse(ai as AIResponse);
            })
            .catch(console.error)
            .finally(() => setAdvisorLoading(false));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleVote(answerId: string, value: 1 | -1) {
    if (!post) return;
    // Optimistic update
    setPost((prev) =>
      prev
        ? {
            ...prev,
            answers_enriched: prev.answers_enriched.map((a) =>
              a.id === answerId
                ? { ...a, vote_total: a.vote_total + value }
                : a
            ),
          }
        : prev
    );
    // Fire-and-forget — castVote is silent when there's no auth session
    castVote(answerId, value).catch(console.warn);
  }

  async function handleAnswer() {
    if (!newAnswer.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createAnswer(postId, newAnswer.trim());
      const updated = await fetchPost(postId);
      setPost(updated);
      setNewAnswer("");
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 rounded-lg bg-gray-800 animate-pulse" />
        <div className="h-48 rounded-xl bg-gray-900 animate-pulse" />
        <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
        <div className="h-32 rounded-xl bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center">
        <p className="text-red-400">{error || "Question not found"}</p>
        <button
          onClick={() => router.push("/feed")}
          className="mt-4 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const answers = post.answers_enriched ?? [];
  const authorName =
    post.profiles?.display_name || post.profiles?.username || "Anonymous";

  return (
    <div className="max-w-3xl space-y-8">
      {/* Back */}
      <button
        onClick={() => router.push("/feed")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </button>

      {/* Question */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              TOPIC_COLORS[post.topic]
            )}
          >
            {post.topic}
          </span>
          {post.resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 border border-green-400/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Resolved
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-100">{post.title}</h1>
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {post.body}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>by</span>
            <span className="text-gray-300 font-medium">{authorName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.view_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* AI Advisor — hero position between question and answers */}
      {advisorLoading && <AIAdvisorLoading />}
      {!advisorLoading && advisorResponse && (
        <AIAdvisorCard ai={advisorResponse} answerCount={answers.length} />
      )}

      {/* Answers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            {answers.length} Answer{answers.length !== 1 ? "s" : ""}
          </p>
          {answers.length > 0 && (
            <p className="text-xs text-gray-600">
              Sorted by credibility-weighted votes
            </p>
          )}
        </div>

        {answers.length === 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-500 text-sm">
              No answers yet. Be the first to help!
            </p>
          </div>
        )}

        {answers.map((answer) => (
          <AnswerCard
            key={answer.id}
            answer={answer}
            isAccepted={answer.id === post.accepted_answer_id}
            onVote={handleVote}
            postTopic={post.topic}
          />
        ))}
      </div>

      {/* Post answer */}
      <div className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          Your Answer
        </p>
        <textarea
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors resize-none"
          placeholder="Share what you know. Your credibility score in this topic influences how much your answer is weighted by the AI advisor."
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          rows={5}
        />
        {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
        <button
          onClick={handleAnswer}
          disabled={submitting || newAnswer.trim().length < 10}
          className="px-6 py-2.5 bg-amber-400 text-gray-950 font-semibold text-sm rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting…" : "Post Answer"}
        </button>
      </div>
    </div>
  );
}
