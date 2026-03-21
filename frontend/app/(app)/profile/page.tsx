"use client";

import { useState, useEffect } from "react";
import { BookOpen, TrendingUp, Award } from "lucide-react";
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

function TopicBar({
  topic,
  score,
  maxScore,
}: {
  topic: Topic;
  score: number;
  maxScore: number;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const tier = tierFromScore(score);
  const cfg = TIER_CONFIG[tier];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{TOPIC_LABELS[topic]}</span>
        <span className="font-mono" style={{ color: cfg.color }}>
          {score.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: cfg.color }}
        />
      </div>
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
      <div className="space-y-6 max-w-2xl">
        <div className="h-10 w-48 rounded-lg bg-gray-800 animate-pulse" />
        <div className="h-40 rounded-xl bg-gray-900 animate-pulse" />
        <div className="h-64 rounded-xl bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (error || !cred) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center max-w-2xl">
        <p className="text-red-400">{error || "Could not load your profile. Are you logged in?"}</p>
      </div>
    );
  }

  const tierCfg = TIER_CONFIG[cred.tier];
  const topicScores = cred.topic_scores ?? {};
  const maxTopicScore = Math.max(...Object.values(topicScores).map(Number), 1);

  const topTopics = TOPIC_ORDER.filter((t) => (topicScores[t] ?? 0) > 0).sort(
    (a, b) => (topicScores[b] ?? 0) - (topicScores[a] ?? 0)
  );
  const allTopics = TOPIC_ORDER;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Account</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-100">Your Profile</h1>
      </div>

      {/* Credibility hero card */}
      <div
        className="rounded-xl border p-6 space-y-4"
        style={{ borderColor: `${tierCfg.color}30`, backgroundColor: tierCfg.bg }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Total Credibility
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold" style={{ color: tierCfg.color }}>
                {cred.total_score.toLocaleString()}
              </span>
              <CredibilityBadge score={cred.total_score} tier={cred.tier} size="lg" showLabel />
            </div>
          </div>
          <Award className="h-8 w-8 opacity-30" style={{ color: tierCfg.color }} />
        </div>

        {/* Tier progress bar */}
        {(() => {
          const thresholds: Record<string, number> = {
            newcomer: 0,
            learner: 100,
            contributor: 300,
            trusted: 600,
            advisor: 900,
            oracle: 1200,
          };
          const tiers = ["newcomer", "learner", "contributor", "trusted", "advisor", "oracle"];
          const currentIdx = tiers.indexOf(cred.tier);
          const nextTier = tiers[currentIdx + 1];
          const currentMin = thresholds[cred.tier];
          const nextMin = nextTier ? thresholds[nextTier] : null;
          if (!nextMin) return null;
          const pct = Math.min(((cred.total_score - currentMin) / (nextMin - currentMin)) * 100, 100);
          const nextCfg = TIER_CONFIG[nextTier as keyof typeof TIER_CONFIG];
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{tierCfg.label}</span>
                <span>{nextCfg.label} in {(nextMin - cred.total_score).toLocaleString()} pts</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/20">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: tierCfg.color }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Topic breakdown */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Topic Scores
          </p>
        </div>
        <div className="space-y-4">
          {allTopics.map((topic) => (
            <TopicBar
              key={topic}
              topic={topic}
              score={topicScores[topic] ?? 0}
              maxScore={maxTopicScore}
            />
          ))}
        </div>
        {topTopics.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-2">
            Answer questions to earn topic credibility.
          </p>
        )}
      </div>

      {/* How to grow */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Grow Your Credibility
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { action: "Answer a question", pts: "+10 pts" },
            { action: "Get your answer upvoted", pts: "+5 pts per vote" },
            { action: "Have your answer accepted", pts: "+25 pts" },
            { action: "Ask a good question", pts: "+2 pts per view" },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-300">{item.action}</span>
              <span className="text-xs font-mono text-amber-400">{item.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
