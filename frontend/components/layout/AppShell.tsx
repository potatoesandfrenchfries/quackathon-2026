"use client";

import { type ReactNode } from "react";
import { TopNav } from "./TopNav";
import { AnonAuthProvider } from "@/components/AnonAuthProvider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AnonAuthProvider>
      <TopNav />
      <main className="min-h-screen pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </AnonAuthProvider>
  );
}
