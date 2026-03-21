"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, PenLine, Trophy, User, Search, Bell } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Ask", href: "/ask", icon: PenLine },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 right-0 left-0 z-50 h-16 flex items-center justify-between border-b border-white/5 bg-gray-950/95 px-6 backdrop-blur-xl">
      {/* Logo */}
      <Link href="/feed" className="flex items-center gap-2.5 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-amber-400 flex items-center justify-center">
          <span className="font-black text-gray-950 text-sm font-mono leading-none">B</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white tracking-tight">Buddy</span>
          <span className="font-light text-gray-500 text-sm hidden sm:block">Finance</span>
        </div>
      </Link>

      {/* Center pill nav */}
      <nav className="flex items-center gap-0.5 bg-gray-900 rounded-full p-1 border border-gray-800">
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
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-amber-400 text-gray-950 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative p-2 rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <div className="h-6 w-6 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-amber-400">U</span>
          </div>
          <span className="text-sm text-gray-300 hidden sm:block">Account</span>
        </Link>
      </div>
    </header>
  );
}
