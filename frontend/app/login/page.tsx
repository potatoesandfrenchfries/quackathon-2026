"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-gray-950 text-2xl font-black mx-auto">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in to Buddy</h1>
          <p className="text-gray-500 text-sm">Student financial well-being platform</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-center space-y-2">
            <p className="text-emerald-400 font-semibold">Check your inbox ✓</p>
            <p className="text-gray-400 text-sm">
              We sent a magic link to <strong className="text-white">{email}</strong>.
              Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-widest text-gray-500">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.ac.uk"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors"
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-amber-400 text-gray-950 font-bold rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors"
            >
              {loading ? "Sending…" : "Send Magic Link →"}
            </button>
            <p className="text-center text-xs text-gray-600">
              No password needed. We&apos;ll email you a sign-in link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
