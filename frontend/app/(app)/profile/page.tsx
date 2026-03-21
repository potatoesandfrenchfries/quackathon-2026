"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BookOpen, TrendingUp, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { CredibilityBadge, TIER_CONFIG, tierFromScore } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";
import type { CredibilitySnapshot, Topic } from "@/types/database";

const TOPIC_LABELS: Record<Topic, string> = {
  rent: "Rent",
  loans: "Loans",
  budgeting: "Budgeting",
  investing: "Investing",
  overdraft: "Overdraft",
  savings: "Savings",
  general: "General",
};

const TOPIC_ORDER: Topic[] = ["budgeting", "loans", "rent", "savings", "investing", "overdraft", "general"];

const TIER_THRESHOLDS: Record<string, number> = {
  newcomer: 0,
  learner: 100,
  contributor: 300,
  trusted: 600,
  advisor: 900,
  oracle: 1200,
};
const TIER_SEQUENCE = ["newcomer", "learner", "contributor", "trusted", "advisor", "oracle"];

function TopicBar({ topic, score, maxScore }: { topic: Topic; score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const tier = tierFromScore(score);
  const cfg = TIER_CONFIG[tier];
  const topicColor = cfg.color;

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Icon */}
      <div
        className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: `${topicColor}18`, color: topicColor, border: `1px solid ${topicColor}30` }}
      >
        {TOPIC_LABELS[topic].charAt(0)}
      </div>

      {/* Bar + labels */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300 font-medium">{TOPIC_LABELS[topic]}</span>
          <span className="font-mono" style={{ color: topicColor }}>
            {score.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: topicColor }}
          />
        </div>
      </div>

      {/* % label */}
      <span className="text-[11px] text-gray-600 shrink-0 w-8 text-right">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const [cred, setCred] = useState<CredibilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.credibility
      .me()
      .then(setCred)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-10 w-48 rounded-lg bg-gray-800 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-900 animate-pulse" />
        <div className="h-80 rounded-2xl bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (error || !cred) {
    return (
      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center max-w-2xl">
        <p className="text-red-400">{error || "Could not load your profile. Are you logged in?"}</p>
      </div>
    );
  }

  const tierCfg = TIER_CONFIG[cred.tier];
  const topicScores = cred.topic_scores ?? {};
  const maxTopicScore = Math.max(...Object.values(topicScores).map(Number), 1);
  const allTopics = TOPIC_ORDER;

  // Tier progress ring data
  const currentIdx = TIER_SEQUENCE.indexOf(cred.tier);
  const nextTier = TIER_SEQUENCE[currentIdx + 1];
  const currentMin = TIER_THRESHOLDS[cred.tier];
  const nextMin = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const ringPct = nextMin
    ? Math.min(((cred.total_score - currentMin) / (nextMin - currentMin)) * 100, 100)
    : 100;

  const ringData = [
    { value: ringPct },
    { value: Math.max(0, 100 - ringPct) },
  ];

  return (
    <div className="max-w-3xl space-y-4">
      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
        style={{ borderColor: `${tierCfg.color}25`, border: `1px solid ${tierCfg.color}25`, backgroundColor: tierCfg.bg }}
      >
        {/* Radial ring */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ringData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={66}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={tierCfg.color} />
                <Cell fill="rgba(255,255,255,0.06)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Score overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black" style={{ color: tierCfg.color }}>
              {cred.total_score.toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5">pts</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Total Credibility</p>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <CredibilityBadge score={cred.total_score} tier={cred.tier} size="lg" showLabel />
            </div>
          </div>

          {nextMin && nextTier && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{tierCfg.label}</span>
                <span>
                  {TIER_CONFIG[nextTier as keyof typeof TIER_CONFIG].label} in{" "}
                  <span style={{ color: tierCfg.color }} className="font-mono font-semibold">
                    {(nextMin - cred.total_score).toLocaleString()} pts
                  </span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/20">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${ringPct}%`, backgroundColor: tierCfg.color }}
                />
              </div>
            </div>
          )}

          {!nextMin && (
            <p className="text-xs font-semibold" style={{ color: tierCfg.color }}>
              Maximum tier reached — Oracle status!
            </p>
          )}
        </div>
      </div>

      {/* ── Topic scores ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <p className="font-semibold text-white text-sm">Topic Scores</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-gray-700" />
        </div>

        <div className="divide-y divide-gray-800/60">
          {allTopics.map((topic) => (
            <TopicBar
              key={topic}
              topic={topic}
              score={topicScores[topic] ?? 0}
              maxScore={maxTopicScore}
            />
          ))}
        </div>

        {Object.values(topicScores).every((v) => v === 0) && (
          <p className="text-sm text-gray-600 text-center py-4">
            Answer questions to earn topic credibility.
          </p>
        )}
      </div>

      {/* ── How to grow ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <p className="font-semibold text-white text-sm">Grow Your Credibility</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { action: "Answer a question", pts: "+10 pts" },
            { action: "Get your answer upvoted", pts: "+5 pts per vote" },
            { action: "Have your answer accepted", pts: "+25 pts" },
            { action: "Ask a quality question", pts: "+2 pts per view" },
          ].map((item) => (
            <div
              key={item.action}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700/50"
            >
              <span className="text-sm text-gray-300">{item.action}</span>
              <span className="text-xs font-mono text-amber-400 shrink-0 ml-2">{item.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
