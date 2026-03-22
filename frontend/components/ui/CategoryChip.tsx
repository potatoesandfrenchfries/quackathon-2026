import { cn } from "@/lib/utils";
import { categoryConfig } from "@/data/mock";
import type { SpendingCategory } from "@/store/useFinancialProfileStore";

interface CategoryChipProps {
  category: SpendingCategory;
  selected: boolean;
  onToggle: () => void;
}

export function CategoryChip({ category, selected, onToggle }: CategoryChipProps) {
  const cfg = categoryConfig[category];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all",
        selected
          ? "border-amber-400 bg-amber-400/10 text-amber-400"
          : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300"
      )}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </button>
  );
}
