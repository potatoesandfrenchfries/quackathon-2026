"use client";

/**
 * AnonAuthProvider
 *
 * Silently signs every visitor in as a shared guest account so they can post
 * questions and answers without any login UI. The guest account is created by
 * calling /api/seed once.
 *
 * Session is persisted in localStorage by @supabase/ssr, so subsequent page
 * loads skip the sign-in call entirely.
 */

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const GUEST_EMAIL = "guest@buddy-demo.local";
const GUEST_PASSWORD = "buddy-demo-guest-2026";

export function AnonAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // No session — sign in as the shared guest account
        supabase.auth.signInWithPassword({
          email: GUEST_EMAIL,
          password: GUEST_PASSWORD,
        }).catch(() => {
          // Guest account doesn't exist yet — call /api/seed first
          console.warn("[AnonAuth] Guest account not found. Visit /api/seed to set up demo data.");
        });
      }
    });
  }, []);

  return <>{children}</>;
}
