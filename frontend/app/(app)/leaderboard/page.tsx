"use client";

import { useState, useEffect } from "react";
import { Trophy, ArrowUpRight } from "lucide-react";
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

  const topScore = entries[0]?.total_score ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Community</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Credibility Leaderboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Ranked by total credibility across all financial topics.
          </p>
        </div>
        <Trophy className="h-6 w-6 text-amber-400 mt-1" />
      </div>

      {/* Tier summary bento */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {TIER_ORDER.map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const count = tierCounts[tier] ?? 0;
            return (
              <div
                key={tier}
                className="rounded-2xl border p-4 space-y-2"
                style={{ borderColor: `${cfg.color}25`, backgroundColor: cfg.bg }}
              >
                <p
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </p>
                <p className="text-3xl font-bold" style={{ color: cfg.color }}>
                  {count}
                </p>
                <p className="text-[11px] text-gray-600">users</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-900 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-12 text-center space-y-3">
          <Trophy className="h-8 w-8 text-gray-700 mx-auto" />
          <p className="text-gray-400 text-sm">No users on the leaderboard yet.</p>
          <p className="text-gray-600 text-xs">Start answering questions to earn credibility!</p>
        </div>
      )}

      {/* Rankings table */}
      {!loading && !error && entries.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-800">
            <div className="col-span-1 font-mono text-[10px] uppercase tracking-widest text-gray-700">#</div>
            <div className="col-span-6 font-mono text-[10px] uppercase tracking-widest text-gray-700">User</div>
            <div className="col-span-3 font-mono text-[10px] uppercase tracking-widest text-gray-700">Score / bar</div>
            <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-gray-700 text-right">Tier</div>
          </div>

          {/* Rows */}
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const tier = entry.tier ?? tierFromScore(entry.total_score);
            const name = entry.display_name || entry.username || "Anonymous";
            const tierCfg = TIER_CONFIG[tier];
            const barPct = (entry.total_score / topScore) * 100;

            return (
              <div
                key={entry.user_id}
                className={cn(
                  "grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/60 last:border-0 transition-colors hover:bg-gray-800/40 group",
                  rank <= 3 && "bg-gray-800/20"
                )}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  {rank <= 3 ? (
                    <span className="text-base">{RANK_MEDALS[rank]}</span>
                  ) : (
                    <span className="font-mono text-sm text-gray-600">{rank}</span>
                  )}
                </div>

                {/* User */}
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border"
                    style={{
                      backgroundColor: tierCfg.bg,
                      color: tierCfg.color,
                      borderColor: `${tierCfg.color}30`,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-200 truncate text-sm group-hover:text-white transition-colors">
                      {name}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">@{entry.username}</p>
                  </div>
                </div>

                {/* Score + bar */}
                <div className="col-span-3 flex flex-col justify-center gap-1.5">
                  <CredibilityBadge score={entry.total_score} tier={tier} size="sm" />
                  <div className="h-1.5 w-full rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, backgroundColor: tierCfg.color }}
                    />
                  </div>
                </div>

                {/* Tier label */}
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
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white text-sm">How Credibility Works</p>
          <ArrowUpRight className="h-4 w-4 text-gray-700" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <div className="space-y-2 p-4 rounded-xl bg-gray-800">
            <p className="text-amber-400 font-semibold text-xs uppercase tracking-wider">Earn points</p>
            <div className="space-y-1 text-xs text-gray-400">
              <p>✓ Getting answers upvoted</p>
              <p>✓ Having answers accepted</p>
              <p>✓ Asking quality questions</p>
            </div>
          </div>
          <div className="space-y-2 p-4 rounded-xl bg-gray-800">
            <p className="text-red-400 font-semibold text-xs uppercase tracking-wider">Lose points</p>
            <div className="space-y-1 text-xs text-gray-400">
              <p>✗ Answers getting downvoted</p>
              <p>✗ Misleading fact checks</p>
              <p>✗ Staking and being wrong</p>
            </div>
          </div>
          <div className="space-y-2 p-4 rounded-xl bg-gray-800">
            <p className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">Why it matters</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              The AI weights answers by credibility — high scores mean your advice reaches more students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
