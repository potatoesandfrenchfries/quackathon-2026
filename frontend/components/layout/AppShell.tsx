"use client";

import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";

const COLLAPSED_KEY = "buddy-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <>
      <TopNav onMenuClick={() => setMobileOpen((o) => !o)} />
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={cn(
          "min-h-screen pt-14 transition-all duration-200",
          collapsed ? "md:pl-16" : "md:pl-60"
        )}
      >
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
