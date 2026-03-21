import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showPercent?: boolean;
  label?: string;
  warn?: boolean;
}

export function ProgressBar({
  value,
  max,
  color = "#34D399",
  className,
  size = "md",
  showPercent = false,
  label,
  warn,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const isOver = value > max;
  const fillColor = warn && isOver ? "#F87171" : color;

  const heights: Record<string, string> = { sm: "h-1.5", md: "h-2", lg: "h-3" };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-gray-500">{label}</span>}
          {showPercent && (
            <span className={cn("text-xs font-medium", isOver && warn ? "text-red-400" : "text-gray-500")}>
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full bg-gray-800 rounded-full overflow-hidden", heights[size])}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}
