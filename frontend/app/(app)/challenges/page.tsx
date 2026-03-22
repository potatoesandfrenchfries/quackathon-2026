"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Users, Trophy, CheckCircle2, Clock, Flame, Plus,
  Sparkles, ArrowRight, Target,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Challenge, ChallengeParticipant, Topic } from "@/types/database";

// ─── topic config ─────────────────────────────────────────────────────────────

const TOPIC_BG: Record<Topic, string> = {
  rent:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  loans:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  budgeting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  investing: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  overdraft: "bg-red-500/10 text-red-400 border-red-500/20",
  savings:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  general:   "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const TOPIC_EMOJI: Record<Topic, string> = {
  rent: "🏠", loans: "🎓", budgeting: "📊", investing: "📈",
  overdraft: "⚠️", savings: "💰", general: "💬",
};

// ─── demo data ────────────────────────────────────────────────────────────────

const DEMO_CHALLENGES: Challenge[] = [
  {
    id: "demo-1", created_by: null,
    title: "Emergency Fund Starter",
    description: "Save your first £500 emergency fund in 30 days.",
    topic: "savings", target_description: "Save £500 in 30 days",
    duration_days: 30, participant_count: 47, completed_count: 12,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "demo-2", created_by: null,
    title: "50/30/20 February",
    description: "Stick to the 50/30/20 rule for a full month. Track every spend.",
    topic: "budgeting", target_description: "Follow 50/30/20 for 30 days",
    duration_days: 30, participant_count: 83, completed_count: 31,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: "demo-3", created_by: null,
    title: "No-Spend Week",
    description: "Go 7 days buying only absolute necessities: food, transport, utilities.",
    topic: "budgeting", target_description: "Zero non-essential purchases for 7 days",
    duration_days: 7, participant_count: 124, completed_count: 58,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-4", created_by: null,
    title: "Open Your First ISA",
    description: "Open a Stocks & Shares ISA and make your first deposit — even £1 counts.",
    topic: "investing", target_description: "Open ISA and make first deposit",
    duration_days: 14, participant_count: 39, completed_count: 27,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "demo-5", created_by: null,
    title: "Overdraft-Free Month",
    description: "Spend 30 days without dipping into your overdraft.",
    topic: "overdraft", target_description: "Stay out of overdraft for 30 days",
    duration_days: 30, participant_count: 62, completed_count: 19,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "demo-6", created_by: null,
    title: "Student Loan Reality Check",
    description: "Calculate your actual repayment timeline and share what you learned.",
    topic: "loans", target_description: "Calculate and post your repayment projection",
    duration_days: 7, participant_count: 91, completed_count: 74,
    is_active: true, created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
];

// ─── challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onJoin,
  onCheckin,
  joining,
}: {
  challenge: Challenge;
  onJoin: (id: string) => void;
  onCheckin: (id: string, status: "on_track" | "slipped") => void;
  joining: string | null;
}) {
  const p = challenge.my_participation;
  const isJoined = !!p && p.status !== "abandoned";
  const isCompleted = p?.status === "completed";
  const needsCheckin =
    isJoined &&
    !isCompleted &&
    p.last_checkin_at
      ? Date.now() - new Date(p.last_checkin_at).getTime() > 7 * 86400000
      : isJoined && !isCompleted;

  const topicBg = challenge.topic ? TOPIC_BG[challenge.topic] : TOPIC_BG.general;
  const topicEmoji = challenge.topic ? TOPIC_EMOJI[challenge.topic] : "💬";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gray-900 p-5 flex flex-col gap-4 transition-all",
        isJoined ? "border-amber-400/30" : "border-gray-800 hover:border-gray-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {challenge.topic && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  topicBg
                )}
              >
                {topicEmoji} {challenge.topic}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock className="h-3 w-3" />
              {challenge.duration_days}d
            </span>
          </div>
          <h3 className="font-bold text-gray-100 leading-snug">{challenge.title}</h3>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{challenge.description}</p>
        </div>
        {isCompleted && (
          <div className="shrink-0 h-9 w-9 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-emerald-400" />
          </div>
        )}
      </div>

      {/* Target */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 text-xs text-gray-400">
        <Target className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span>{challenge.target_description}</span>
      </div>

      {/* Recommendation reason */}
      {challenge.recommendation_reason && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-400/5 border border-amber-400/10 text-xs text-amber-400/80">
          <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{challenge.recommendation_reason}</span>
        </div>
      )}

      {/* Streak info */}
      {isJoined && !isCompleted && p && p.checkin_streak > 0 && (
        <div className="flex items-center gap-2 text-xs text-orange-400">
          <Flame className="h-3.5 w-3.5" />
          <span>{p.checkin_streak}-week streak</span>
        </div>
      )}

      {/* Footer: count + action */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-1 border-t border-gray-800/60">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-mono font-bold text-gray-300">{challenge.participant_count}</span>
            <span>in this</span>
          </span>
          {challenge.completed_count > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-mono">{challenge.completed_count}</span>
              <span>done</span>
            </span>
          )}
        </div>

        {/* Action button */}
        {isCompleted ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        ) : needsCheckin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCheckin(challenge.id, "on_track")}
              className="px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-colors"
            >
              Still on track
            </button>
            <button
              onClick={() => onCheckin(challenge.id, "slipped")}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs hover:text-gray-200 transition-colors"
            >
              Slipped
            </button>
          </div>
        ) : isJoined ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <span>You&apos;re #{p?.join_number}</span>
            <span className="text-gray-600">· In Progress</span>
          </span>
        ) : (
          <button
            onClick={() => onJoin(challenge.id)}
            disabled={joining === challenge.id}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 text-gray-950 text-xs font-bold hover:bg-amber-300 disabled:opacity-50 transition-colors"
          >
            {joining === challenge.id ? (
              "Joining…"
            ) : (
              <>
                Join
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-3 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-800" />
        <div className="h-5 w-10 rounded bg-gray-800" />
      </div>
      <div className="h-6 w-3/4 rounded bg-gray-800" />
      <div className="h-4 w-full rounded bg-gray-800" />
      <div className="h-4 w-2/3 rounded bg-gray-800" />
      <div className="h-9 w-full rounded-xl bg-gray-800" />
      <div className="flex justify-between pt-2 border-t border-gray-800">
        <div className="h-4 w-24 rounded bg-gray-800" />
        <div className="h-7 w-16 rounded-xl bg-gray-800" />
      </div>
    </div>
  );
}

// ─── join toast ───────────────────────────────────────────────────────────────

function JoinToast({ joinNumber, title, onDone }: { joinNumber: number; title: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gray-900 border border-amber-400/30 shadow-2xl shadow-black/60">
        <div className="h-9 w-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <Trophy className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-100">
            You&apos;re <span className="text-amber-400">#{joinNumber}</span> to join!
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{title}</p>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type Tab = "all" | "mine" | "recommended";

export default function ChallengesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [toast, setToast] = useState<{ joinNumber: number; title: string } | null>(null);

  const loadChallenges = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      let data: Challenge[];
      if (t === "recommended") data = await api.challenges.recommended();
      else if (t === "mine")    data = await api.challenges.mine();
      else                      data = await api.challenges.list();
      setChallenges(data);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChallenges(tab); }, [tab, loadChallenges]);

  async function handleJoin(id: string) {
    setJoining(id);
    const challenge = challenges.find((c) => c.id === id);
    try {
      const result = await api.challenges.join(id);
      const joinNumber = result.join_number ?? (challenge?.participant_count ?? 0) + 1;
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                participant_count: c.participant_count + 1,
                my_participation: {
                  id: result.id ?? "temp",
                  challenge_id: id,
                  user_id: "",
                  join_number: joinNumber,
                  status: "active",
                  checkin_streak: 0,
                  last_checkin_at: null,
                  completed_at: null,
                  joined_at: new Date().toISOString(),
                },
              }
            : c
        )
      );
      setToast({ joinNumber, title: challenge?.title ?? "" });
    } catch {
      // silently fail — user sees no change
    } finally {
      setJoining(null);
    }
  }

  async function handleCheckin(id: string, status: "on_track" | "slipped") {
    try {
      await api.challenges.checkin(id, status);
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== id || !c.my_participation) return c;
          return {
            ...c,
            my_participation: {
              ...c.my_participation,
              checkin_streak:
                status === "on_track" ? c.my_participation.checkin_streak + 1 : 0,
              last_checkin_at: new Date().toISOString(),
            },
          };
        })
      );
    } catch {
      // silently fail
    }
  }

  const display = apiOnline ? challenges : tab === "all" ? DEMO_CHALLENGES : [];
  const showingDemo = !apiOnline && tab === "all";

  const TABS: { id: Tab; label: string }[] = [
    { id: "all",         label: "All Challenges" },
    { id: "mine",        label: "My Challenges"  },
    { id: "recommended", label: "Recommended"    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Challenges</h1>
          <p className="text-gray-500 text-sm mt-1">
            Join time-boxed habits. See how many students are already doing them.
          </p>
        </div>
        {showingDemo && (
          <span className="text-[11px] text-amber-500/60 font-mono">(demo)</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-gray-800 bg-gray-900 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-amber-400 text-gray-950 font-bold"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Recommended explainer */}
      {tab === "recommended" && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-400/5 border border-amber-400/10">
          <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-400 leading-relaxed">
            AI-picked challenges based on your financial snapshot. The more you&apos;ve shared
            about your situation, the more relevant these become.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <ChallengeSkeleton key={i} />)}
        </div>
      )}

      {/* Cards */}
      {!loading && display.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {display.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onJoin={handleJoin}
              onCheckin={handleCheckin}
              joining={joining}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && display.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto">
            <Trophy className="h-7 w-7 text-gray-600" />
          </div>
          <div>
            <p className="text-gray-300 font-semibold">
              {tab === "mine"
                ? "You haven't joined any challenges yet"
                : tab === "recommended"
                ? "No recommendations yet"
                : "No challenges available"}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {tab === "mine"
                ? "Browse all challenges and join one to get started"
                : "Check back soon — new challenges are added regularly"}
            </p>
          </div>
          {tab === "mine" && (
            <button
              onClick={() => setTab("all")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-gray-950 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Browse challenges
            </button>
          )}
        </div>
      )}

      {/* Join toast */}
      {toast && (
        <JoinToast
          joinNumber={toast.joinNumber}
          title={toast.title}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
