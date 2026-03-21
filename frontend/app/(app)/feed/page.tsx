"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, Eye, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { CredibilityBadge, TIER_CONFIG, tierFromScore } from "@/components/CredibilityBadge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Post, Topic } from "@/types/database";

const TOPICS: { value: Topic | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "rent", label: "Rent" },
  { value: "loans", label: "Loans" },
  { value: "budgeting", label: "Budgeting" },
  { value: "investing", label: "Investing" },
  { value: "overdraft", label: "Overdraft" },
  { value: "savings", label: "Savings" },
  { value: "general", label: "General" },
];

const TOPIC_COLORS: Record<Topic, string> = {
  rent: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  loans: "bg-purple-400/10 text-purple-400 border-purple-400/30",
  budgeting: "bg-green-400/10 text-green-400 border-green-400/30",
  investing: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  overdraft: "bg-red-400/10 text-red-400 border-red-400/30",
  savings: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  general: "bg-gray-400/10 text-gray-400 border-gray-400/30",
};

function StatsCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function QuestionCard({ post }: { post: Post }) {
  const bodyExcerpt = post.body.length > 120 ? post.body.slice(0, 120) + "…" : post.body;
  const authorName = post.profiles?.display_name || post.profiles?.username || "Anonymous";

  return (
    <Link href={`/feed/${post.id}`}>
      <div className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-600 hover:bg-gray-800/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                  TOPIC_COLORS[post.topic]
                )}
              >
                {post.topic}
              </span>
              {post.resolved && (
                <span className="inline-flex items-center rounded-full bg-green-400/10 border border-green-400/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-400">
                  Resolved
                </span>
              )}
              {post.ai_responses && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{bodyExcerpt}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-amber-400 shrink-0 mt-1 transition-colors" />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-400">{authorName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.view_count}
            </span>
            <span className="text-gray-700">·</span>
            <span>{formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | "all">("all");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.posts
      .list(activeTopic !== "all" ? { topic: activeTopic } : undefined)
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTopic]);

  const totalQuestions = posts.length;
  const openQuestions = posts.filter((p) => !p.resolved).length;
  const resolvedQuestions = posts.filter((p) => p.resolved).length;
  const withAI = posts.filter((p) => p.ai_responses).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Community</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-100">Question Feed</h1>
        <p className="mt-1 text-gray-400">
          Student financial questions, ranked by credibility-weighted answers.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard label="Total Questions" value={totalQuestions} sub="in current view" />
        <StatsCard label="Open" value={openQuestions} sub="awaiting answers" />
        <StatsCard label="Resolved" value={resolvedQuestions} sub="accepted answers" />
        <StatsCard label="AI Assisted" value={withAI} sub="with Buddy AI insight" />
      </div>

      {/* Topic filter */}
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTopic(t.value)}
            className={cn(
              "px-3 py-1.5 rounded-full border font-mono text-xs uppercase tracking-wider transition-colors",
              activeTopic === t.value
                ? "border-amber-400 bg-amber-400/10 text-amber-400"
                : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Question list */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-gray-800 bg-gray-900 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <p className="text-red-400 font-mono text-sm">{error}</p>
          <button
            onClick={() => setActiveTopic(activeTopic)}
            className="mt-3 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <MessageSquare className="h-8 w-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No questions yet in this topic.</p>
          <Link
            href="/ask"
            className="mt-4 inline-block px-6 py-2.5 bg-amber-400 text-gray-950 font-semibold text-sm rounded-lg hover:bg-amber-300 transition-colors"
          >
            Be the first to ask
          </Link>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <QuestionCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
