"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { CredibilityBadge, TIER_CONFIG, tierFromScore } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";
import type { CredTier } from "@/types/database";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  total_score: number;
  tier: CredTier;
}

const TIER_ORDER: CredTier[] = ["oracle", "advisor", "trusted", "contributor", "learner", "newcomer"];

function TierCard({ tier, count }: { tier: CredTier; count: number }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <div
      className="rounded-xl border p-4 space-y-1"
      style={{
        borderColor: `${cfg.color}30`,
        backgroundColor: cfg.bg,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: cfg.color }}>
        {cfg.label}
      </p>
      <p className="text-2xl font-bold" style={{ color: cfg.color }}>
        {count}
      </p>
      <p className="text-xs text-gray-600">users</p>
    </div>
  );
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.credibility
      .leaderboard()
      .then((data: any) => setEntries(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tierCounts = TIER_ORDER.reduce<Record<CredTier, number>>(
    (acc, t) => {
      acc[t] = entries.filter((e) => e.tier === t || tierFromScore(e.total_score) === t).length;
      return acc;
    },
    {} as Record<CredTier, number>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Community</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-100">Credibility Leaderboard</h1>
        <p className="mt-1 text-gray-400">
          Users ranked by total credibility score across all financial topics.
        </p>
      </div>

      {/* Tier summary cards */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {TIER_ORDER.map((tier) => (
            <TierCard key={tier} tier={tier} count={tierCounts[tier] ?? 0} />
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-900 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <Trophy className="h-8 w-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No users on the leaderboard yet.</p>
          <p className="text-gray-600 text-sm mt-1">Start answering questions to earn credibility!</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-800">
            <div className="col-span-1 font-mono text-[10px] uppercase tracking-widest text-gray-600">
              #
            </div>
            <div className="col-span-6 font-mono text-[10px] uppercase tracking-widest text-gray-600">
              User
            </div>
            <div className="col-span-3 font-mono text-[10px] uppercase tracking-widest text-gray-600 text-right">
              Score
            </div>
            <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-gray-600 text-right">
              Tier
            </div>
          </div>

          {/* Rows */}
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const tier = entry.tier ?? tierFromScore(entry.total_score);
            const name = entry.display_name || entry.username || "Anonymous";
            const tierCfg = TIER_CONFIG[tier];

            return (
              <div
                key={entry.user_id}
                className={cn(
                  "grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800 last:border-0 transition-colors hover:bg-gray-800/40",
                  rank <= 3 && "bg-gray-800/20"
                )}
              >
                <div className="col-span-1 flex items-center">
                  {rank <= 3 ? (
                    <span className="text-lg">{RANK_MEDALS[rank]}</span>
                  ) : (
                    <span className="font-mono text-sm text-gray-600">{rank}</span>
                  )}
                </div>
                <div className="col-span-6 flex items-center gap-2 min-w-0">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: tierCfg.bg, color: tierCfg.color }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-200 truncate">{name}</span>
                </div>
                <div className="col-span-3 flex items-center justify-end">
                  <CredibilityBadge score={entry.total_score} tier={tier} size="sm" />
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: tierCfg.color }}
                  >
                    {tierCfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          How Credibility Works
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm text-gray-400">
          <div className="space-y-1">
            <p className="text-amber-400 font-semibold">Earn points by</p>
            <p>✓ Getting answers upvoted</p>
            <p>✓ Having answers accepted</p>
            <p>✓ Asking quality questions</p>
          </div>
          <div className="space-y-1">
            <p className="text-amber-400 font-semibold">Lose points by</p>
            <p>✗ Answers getting downvoted</p>
            <p>✗ Misleading fact checks</p>
            <p>✗ Staking and being wrong</p>
          </div>
          <div className="space-y-1">
            <p className="text-amber-400 font-semibold">Why it matters</p>
            <p>The AI weights answers by credibility — high scores mean your advice reaches more students.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
