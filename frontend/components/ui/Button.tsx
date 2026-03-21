import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   "bg-amber-400 text-gray-950 hover:bg-amber-300 active:bg-amber-500",
  secondary: "bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700 active:bg-gray-600",
  ghost:     "bg-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100 active:bg-gray-700",
  danger:    "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-950/60 active:bg-red-950",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
