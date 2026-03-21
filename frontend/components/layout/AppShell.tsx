"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";


export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <TopNav onMenuClick={() => setSidebarOpen((o) => !o)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className={cn("min-h-screen pt-14 transition-all duration-200 md:pl-60")}>
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
