"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Target,
  User, Users, X, Flame, Zap, Trophy, BookOpen,
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { TierBadge } from "@/components/ui/Badge";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/feed",         label: "Community",    icon: Users           },
  { href: "/check",        label: "AI Checks",    icon: Zap             },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight  },
  { href: "/budget",       label: "Budget",       icon: PieChart        },
  { href: "/goals",        label: "Goals",        icon: Target          },
  { href: "/challenges",   label: "Challenges",   icon: Trophy          },
  { href: "/assignments",  label: "Assignments",  icon: BookOpen        },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUserStore();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800
          flex flex-col transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-gray-950 font-bold text-sm select-none">
              B
            </div>
            <span className="font-semibold text-gray-100 text-lg tracking-tight">Buddy</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {/* Streak banner */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-orange-950/40 border border-orange-900/30 flex items-center gap-2">
          <Flame size={16} className="text-orange-400 flex-shrink-0" />
          <span className="text-xs font-medium text-orange-300">
            {user.gamification.streak}-day streak
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150
                  ${active
                    ? "bg-amber-400/10 text-amber-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                  }
                `}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Level progress */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span className="font-medium text-gray-400">Level {user.gamification.level}</span>
            <span>{user.gamification.xp.toLocaleString()} / {user.gamification.xpToNext.toLocaleString()} XP</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${(user.gamification.xp / user.gamification.xpToNext) * 100}%` }}
            />
          </div>
        </div>

        {/* User profile */}
        <div className="p-3 border-t border-gray-800">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-semibold text-sm flex-shrink-0">
              {user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-100 truncate">{user.displayName}</div>
              <TierBadge tier={user.credibility.tier} score={user.credibility.total} className="mt-0.5" />
            </div>
            <User size={15} className="text-gray-500 flex-shrink-0" />
          </Link>
        </div>
      </aside>
    </>
  );
}
