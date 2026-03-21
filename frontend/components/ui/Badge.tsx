import { cn } from "@/lib/utils";
import { categoryConfig, type Category } from "@/data/mock";

interface BadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: BadgeProps) {
  const cfg = categoryConfig[category];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", className)}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

interface TierBadgeProps {
  tier: string;
  score: number;
  className?: string;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  newcomer:    { bg: "#F1F5F9", text: "#64748B" },
  learner:     { bg: "#EFF6FF", text: "#2563EB" },
  contributor: { bg: "#ECFDF5", text: "#10B981" },
  trusted:     { bg: "#FFF7ED", text: "#F97316" },
  advisor:     { bg: "#FDF4FF", text: "#A855F7" },
  oracle:      { bg: "#F0F9FF", text: "#0EA5E9" },
};

export function TierBadge({ tier, score, className }: TierBadgeProps) {
  const colors = tierColors[tier] ?? tierColors.newcomer;
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize", className)}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      ⬡ {score} · {tier}
    </span>
  );
}
