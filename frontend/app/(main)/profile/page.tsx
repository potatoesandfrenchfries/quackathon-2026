"use client";
import { useState } from "react";
import {
  User, GraduationCap, Flame, Zap, Star,
  Shield, Award, Bell, Moon, Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useUserStore } from "@/store/useUserStore";

const TIER_PROGRESSION = [
  { tier: "newcomer",    min: 0,    max: 99,   color: "#64748B" },
  { tier: "learner",     min: 100,  max: 299,  color: "#2563EB" },
  { tier: "contributor", min: 300,  max: 599,  color: "#10B981" },
  { tier: "trusted",     min: 600,  max: 899,  color: "#F97316" },
  { tier: "advisor",     min: 900,  max: 1199, color: "#A855F7" },
  { tier: "oracle",      min: 1200, max: 1500, color: "#0EA5E9" },
];

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? "bg-brand-secondary" : "bg-slate-200"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useUserStore();
  const [prefs, setPrefs] = useState({
    notifications: true,
    emailDigest: false,
    darkMode: false,
    streakReminders: true,
  });

  const { level, xp, xpToNext, streak, totalXpEarned, badges } = user.gamification;
  const { total: credTotal, tier, topTopics } = user.credibility;
  const currentTier = TIER_PROGRESSION.find((t) => t.tier === tier)!;
  const nextTier = TIER_PROGRESSION.find((t) => t.min > credTotal);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      {/* Identity */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl flex-shrink-0">
            {user.avatarInitials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
              <GraduationCap size={14} />
              <span>{user.university}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <TierBadge tier={tier} score={credTotal} />
            </div>
          </div>
        </div>
      </Card>

      {/* Credibility */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-brand-secondary" />
          <h2 className="text-base font-semibold text-slate-900">Credibility</h2>
        </div>

        <div className="text-3xl font-bold text-slate-900 mb-1">{credTotal}</div>
        <p className="text-sm text-slate-500 mb-4 capitalize">{tier} tier</p>

        {nextTier && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span className="capitalize">{tier}</span>
              <span className="capitalize">{nextTier.tier} at {nextTier.min}</span>
            </div>
            <ProgressBar
              value={credTotal - currentTier.min}
              max={currentTier.max - currentTier.min}
              color={nextTier.color}
              size="md"
            />
            <p className="text-xs text-slate-400 mt-1.5">{nextTier.min - credTotal} more to reach {nextTier.tier}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top topics</p>
          {topTopics.map((t) => (
            <div key={t.topic} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 capitalize w-24 flex-shrink-0">{t.topic}</span>
              <div className="flex-1">
                <ProgressBar value={t.score} max={500} color="#10B981" size="sm" />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{t.score}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Gamification */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-brand-coral" />
          <h2 className="text-base font-semibold text-slate-900">Achievements</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: Star,  label: "Level",         value: level,                         color: "blue"   },
            { icon: Flame, label: "Day Streak",     value: streak,                        color: "orange" },
            { icon: Zap,   label: "Total XP",       value: totalXpEarned.toLocaleString(), color: "violet" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`text-center p-3 rounded-xl bg-${color}-50`}>
              <Icon size={20} className={`mx-auto text-${color}-500 mb-1`} />
              <div className={`text-xl font-bold text-${color}-700`}>{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700"
              >
                <Award size={12} className="text-brand-coral" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Preferences</h2>
        </div>
        <div className="divide-y divide-slate-50">
          <Toggle label="Push notifications" description="Alerts for votes, replies, and tips" value={prefs.notifications} onChange={(v) => setPrefs({ ...prefs, notifications: v })} />
          <Toggle label="Weekly digest" description="Email summary every Monday" value={prefs.emailDigest} onChange={(v) => setPrefs({ ...prefs, emailDigest: v })} />
          <Toggle label="Streak reminders" description="Daily nudge to keep your streak alive" value={prefs.streakReminders} onChange={(v) => setPrefs({ ...prefs, streakReminders: v })} />
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Data</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
          <Trash2 size={15} />
          Reset mock data
        </button>
      </Card>
    </div>
  );
}
