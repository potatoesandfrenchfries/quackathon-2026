import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ children, className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-gray-900 rounded-2xl border border-gray-800 p-6",
        hover && "transition-colors duration-200 hover:border-gray-700 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
