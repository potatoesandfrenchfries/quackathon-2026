"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/feed" className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-[0.2em] text-amber-400">
            BUDDY
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-gray-500 sm:inline">
            Financial Intelligence
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/ask"
          className="px-4 py-1.5 bg-amber-400 text-gray-950 font-semibold text-sm rounded-lg hover:bg-amber-300 transition-colors"
        >
          Ask
        </Link>
      </div>
    </header>
  );
}
