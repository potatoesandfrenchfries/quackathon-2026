"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpRight,
  Sparkles,
  Eye,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { CredibilityBadge, TIER_CONFIG, tierFromScore } from "@/components/CredibilityBadge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Post, Topic, CredibilitySnapshot } from "@/types/database";

// ─── constants ────────────────────────────────────────────────────────────────

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

const TOPIC_PIE_COLORS: Record<Topic, string> = {
  budgeting: "#fbbf24",
  loans: "#a78bfa",
  rent: "#60a5fa",
  savings: "#34d399",
  investing: "#f472b6",
  overdraft: "#f87171",
  general: "#6b7280",
};

const TOPIC_BADGE: Record<Topic, string> = {
  rent: "bg-blue-400/10 text-blue-400 border-blue-400/30",
  loans: "bg-purple-400/10 text-purple-400 border-purple-400/30",
  budgeting: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  investing: "bg-pink-400/10 text-pink-400 border-pink-400/30",
  overdraft: "bg-red-400/10 text-red-400 border-red-400/30",
  savings: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
  general: "bg-gray-400/10 text-gray-400 border-gray-400/30",
};

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-3">
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-gray-800 flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-400" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-white tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
      </div>
    </div>
  );
}

function QuestionRow({ post, maxViews }: { post: Post; maxViews: number }) {
  const topicColor = TOPIC_PIE_COLORS[post.topic] ?? "#6b7280";
  const fillPct = maxViews > 0 ? (post.view_count / maxViews) * 100 : 0;

  return (
    <Link href={`/feed/${post.id}`} className="block group">
      <div className="flex items-center gap-4 py-4 px-5 hover:bg-gray-800/50 transition-colors rounded-xl">
        {/* Topic colour square */}
        <div
          className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${topicColor}18`, border: `1px solid ${topicColor}30` }}
        >
          <span className="text-xs font-bold" style={{ color: topicColor }}>
            {post.topic.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-gray-100 group-hover:text-amber-400 transition-colors line-clamp-1">
            {post.title}
          </p>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                TOPIC_BADGE[post.topic]
              )}
            >
              {post.topic}
            </span>
            {post.resolved && (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            )}
            {post.ai_responses && (
              <Sparkles className="h-3 w-3 text-amber-400" />
            )}
            <span className="text-[11px] text-gray-600 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.view_count}
            </span>
            <span className="text-[11px] text-gray-600">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
          {/* Popularity bar */}
          <div className="h-1 w-full rounded-full bg-gray-800">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%`, backgroundColor: topicColor }}
            />
          </div>
        </div>

        {/* View button */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 group-hover:border-amber-400/40 transition-colors">
          <span className="text-xs text-gray-400 group-hover:text-amber-400 transition-colors hidden sm:block">
            View
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-amber-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | "all">("all");
  const [cred, setCred] = useState<CredibilitySnapshot | null>(null);

  // Fetch all posts for stats/charts (once)
  useEffect(() => {
    api.posts.list().then(setAllPosts).catch(() => null);
  }, []);

  // Fetch filtered posts for the list
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.posts
      .list(activeTopic !== "all" ? { topic: activeTopic } : undefined)
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTopic]);

  // Try to fetch credibility silently (fails for unauthenticated users)
  useEffect(() => {
    api.credibility.me().then(setCred).catch(() => null);
  }, []);

  // Computed stats from all posts
  const stats = useMemo(() => {
    const total = allPosts.length;
    const open = allPosts.filter((p) => !p.resolved).length;
    const resolved = allPosts.filter((p) => p.resolved).length;
    const aiAssisted = allPosts.filter((p) => p.ai_responses).length;
    const aiPct = total > 0 ? Math.round((aiAssisted / total) * 100) : 0;
    return { total, open, resolved, aiAssisted, aiPct };
  }, [allPosts]);

  // Topic distribution for donut chart
  const topicData = useMemo(() => {
    const counts: Partial<Record<Topic, number>> = {};
    for (const p of allPosts) {
      counts[p.topic] = (counts[p.topic] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([topic, count]) => ({
        name: topic.charAt(0).toUpperCase() + topic.slice(1),
        topic: topic as Topic,
        value: count as number,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allPosts]);

  const maxViews = useMemo(
    () => Math.max(...posts.map((p) => p.view_count), 1),
    [posts]
  );

  const tierCfg = cred ? TIER_CONFIG[cred.tier] : null;

  return (
    <div className="space-y-4">

      {/* ── Row 1: Hero bento (4 cards) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Credibility hero card — amber if loaded, community if not */}
        {cred && tierCfg ? (
          <div className="rounded-2xl bg-amber-400 p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-gray-950/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-gray-950/70" />
            </div>
            <div>
              <p className="text-xs text-gray-950/60 font-medium">My Credibility</p>
              <p className="mt-1 text-4xl font-black text-gray-950 tracking-tight">
                {cred.total_score.toLocaleString()}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.15)", color: "#0a0a0a" }}
                >
                  {tierCfg.label}
                </span>
              </div>
            </div>
            {/* Decorative arc */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gray-950/10" />
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-400 p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-gray-950/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-gray-950/70" />
            </div>
            <div>
              <p className="text-xs text-gray-950/60 font-medium">Buddy Finance</p>
              <p className="mt-1 text-2xl font-black text-gray-950 leading-tight">
                Student Q&A
              </p>
              <p className="mt-1 text-xs text-gray-950/60">
                Ranked by credibility
              </p>
            </div>
            <Link
              href="/ask"
              className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-950/70 hover:text-gray-950 transition-colors"
            >
              Ask a question <ArrowUpRight className="h-3 w-3" />
            </Link>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gray-950/10" />
          </div>
        )}

        <StatCard
          label="Open Questions"
          value={stats.open}
          sub="awaiting answers"
          icon={MessageSquare}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          sub="accepted answers"
          icon={CheckCircle2}
        />
        <StatCard
          label="AI Assisted"
          value={stats.aiAssisted}
          sub={`${stats.aiPct}% of questions`}
          icon={Sparkles}
        />
      </div>

      {/* ── Row 2: Charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Topic Distribution donut */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white text-sm">Topic Distribution</p>
            <ArrowUpRight className="h-4 w-4 text-gray-600" />
          </div>

          {topicData.length > 0 ? (
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="shrink-0" style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={55}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {topicData.map((entry) => (
                        <Cell
                          key={entry.topic}
                          fill={TOPIC_PIE_COLORS[entry.topic]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid #374151",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: number) => [`${val} questions`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2 min-w-0">
                {topicData.slice(0, 5).map((entry) => (
                  <div key={entry.topic} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: TOPIC_PIE_COLORS[entry.topic] }}
                      />
                      <span className="text-gray-400 truncate">{entry.name}</span>
                    </div>
                    <span className="text-gray-500 shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-700 text-xs py-8">
              No questions yet
            </div>
          )}
        </div>

        {/* AI Advisor Insights — gradient card */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1c1800 0%, #261f00 50%, #1a1428 100%)",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          {/* Decorative blobs */}
          <div
            className="absolute top-0 right-0 h-40 w-40 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: "#fbbf24" }}
          />
          <div
            className="absolute bottom-0 left-0 h-32 w-32 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: "#a78bfa" }}
          />

          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <p className="font-semibold text-white text-sm">AI Advisor Insights</p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-gray-700 text-gray-400">
              Live
            </span>
          </div>

          <div className="relative">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white tracking-tight">
                {stats.aiPct}%
              </span>
              <span className="text-gray-400 text-sm">answered with AI</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Based on {stats.total} community questions
            </p>
          </div>

          {/* Visual bars for open vs resolved */}
          <div className="relative space-y-3">
            {[
              { label: "Resolved", value: stats.resolved, total: stats.total, color: "#34d399" },
              { label: "Open", value: stats.open, total: stats.total, color: "#fbbf24" },
              { label: "AI Assisted", value: stats.aiAssisted, total: stats.total, color: "#a78bfa" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span style={{ color: item.color }} className="font-mono">{item.value}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex items-start gap-3 bg-white/5 rounded-xl p-3">
            <div className="h-7 w-7 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The AI weighs all answers by contributor credibility score before synthesising a response.
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 3: Question list ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        {/* Header with topic filters */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <p className="font-semibold text-white text-sm">Hot Questions</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTopic(t.value)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider transition-colors",
                  activeTopic === t.value
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="divide-y divide-gray-800">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 rounded-xl bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-gray-800 animate-pulse" />
                  <div className="h-2.5 w-1/3 rounded bg-gray-800 animate-pulse" />
                  <div className="h-1 w-full rounded-full bg-gray-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="h-8 w-8 text-gray-700 mx-auto" />
            <p className="text-gray-400 text-sm">No questions in this topic yet.</p>
            <Link
              href="/ask"
              className="inline-block px-5 py-2 bg-amber-400 text-gray-950 font-semibold text-sm rounded-full hover:bg-amber-300 transition-colors"
            >
              Ask the first question
            </Link>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="divide-y divide-gray-800/60">
            {posts.map((post) => (
              <QuestionRow key={post.id} post={post} maxViews={maxViews} />
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && !error && posts.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {posts.length} question{posts.length !== 1 ? "s" : ""}
            </p>
            <Link
              href="/ask"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 text-gray-950 font-semibold text-xs rounded-full hover:bg-amber-300 transition-colors"
            >
              Ask a question
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
