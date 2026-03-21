"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare, PenLine, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { number: "01", label: "Feed", href: "/feed", icon: MessageSquare },
  { number: "02", label: "Ask", href: "/ask", icon: PenLine },
  { number: "03", label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { number: "04", label: "Profile", href: "/profile", icon: User },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 z-40 flex h-[calc(100vh-3.5rem)] flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <nav className="flex flex-col gap-1 p-2 pt-4 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/feed"
                ? pathname === "/feed" || pathname.startsWith("/feed/")
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-amber-400/10 text-amber-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {collapsed ? (
                  <Icon className="h-4 w-4 shrink-0" />
                ) : (
                  <>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-xs font-semibold tracking-wider",
                        isActive ? "text-amber-400" : "text-gray-600"
                      )}
                    >
                      {item.number}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider">
                      {item.label}
                    </span>
                  </>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-gray-800 p-2 md:block">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
