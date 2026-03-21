import type { CredTier } from "@/types/database";

const TIER_CONFIG: Record<CredTier, { label: string; color: string; bg: string }> = {
  newcomer:    { label: "Newcomer",    color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  learner:     { label: "Learner",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  contributor: { label: "Contributor", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  trusted:     { label: "Trusted",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  advisor:     { label: "Advisor",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  oracle:      { label: "Oracle",      color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
};

interface Props {
  score: number;
  tier: CredTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function tierFromScore(score: number): CredTier {
  if (score >= 1200) return "oracle";
  if (score >= 900)  return "advisor";
  if (score >= 600)  return "trusted";
  if (score >= 300)  return "contributor";
  if (score >= 100)  return "learner";
  return "newcomer";
}

export function CredibilityBadge({ score, tier, size = "md", showLabel = false }: Props) {
  const cfg = TIER_CONFIG[tier];
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-mono font-semibold ${sizeClasses}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}40` }}
    >
      <span>{score.toLocaleString()}</span>
      {showLabel && <span className="opacity-70">· {cfg.label}</span>}
    </span>
  );
}

export { TIER_CONFIG, tierFromScore };
