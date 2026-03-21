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
  newcomer:    { bg: "#1E293B", text: "#94A3B8" },
  learner:     { bg: "#1E3A5F", text: "#60A5FA" },
  contributor: { bg: "#064E3B", text: "#34D399" },
  trusted:     { bg: "#431407", text: "#FB923C" },
  advisor:     { bg: "#3B0764", text: "#C084FC" },
  oracle:      { bg: "#0C4A6E", text: "#38BDF8" },
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
