"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost } from "@/lib/supabase/posts";
import { cn } from "@/lib/utils";
import type { Topic } from "@/types/database";

const TOPICS: { value: Topic; label: string; description: string }[] = [
  { value: "rent", label: "Rent", description: "Tenancy, deposits, landlords" },
  { value: "loans", label: "Loans", description: "Student loans, repayments" },
  { value: "budgeting", label: "Budgeting", description: "Managing day-to-day money" },
  { value: "investing", label: "Investing", description: "Stocks, ISAs, long-term growth" },
  { value: "overdraft", label: "Overdraft", description: "Fees, limits, getting out of one" },
  { value: "savings", label: "Savings", description: "Emergency funds, accounts" },
  { value: "general", label: "General", description: "Anything else financial" },
];

function AskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    title: searchParams.get("title") ?? "",
    body: searchParams.get("body") ?? "",
    topic: (searchParams.get("topic") ?? "") as Topic | "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.title.trim().length >= 10 && form.body.trim().length >= 20 && form.topic;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const post = await createPost({
        title: form.title.trim(),
        body: form.body.trim(),
        topic: form.topic as Topic,
      });
      router.push(`/feed/${post.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Community</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-100">Ask a Question</h1>
        <p className="mt-1 text-gray-400">
          The more detail you provide, the better answers you'll receive.
        </p>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">
            Question Title
          </label>
          <input
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors"
            placeholder="e.g. How do I avoid paying overdraft fees as a student?"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={200}
          />
          <p className="mt-1 text-xs text-gray-600 text-right">{form.title.length}/200</p>
        </div>

        {/* Body */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-2">
            Details
          </label>
          <textarea
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-100 placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors resize-none"
            placeholder="Explain your situation in detail. Include any relevant context like your income, expenses, or what you've already tried..."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={6}
          />
          <p className="mt-1 text-xs text-gray-600">Minimum 20 characters</p>
        </div>

        {/* Topic */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-3">
            Topic
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                onClick={() => setForm((f) => ({ ...f, topic: t.value }))}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  form.topic === t.value
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-gray-700 hover:border-gray-600 hover:bg-gray-900"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    form.topic === t.value
                      ? "border-amber-400 bg-amber-400"
                      : "border-gray-600"
                  )}
                >
                  {form.topic === t.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-950" />
                  )}
                </div>
                <div>
                  <p className={cn(
                    "font-semibold text-sm",
                    form.topic === t.value ? "text-amber-400" : "text-gray-300"
                  )}>
                    {t.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-500">
            <span className="text-amber-400 font-semibold">Tip:</span> Answers are weighted by the
            author's credibility score in your chosen topic. High-credibility contributors earn
            points for accepted answers.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-3 bg-amber-400 text-gray-950 font-semibold rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors"
        >
          {loading ? "Posting…" : "Post Question →"}
        </button>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense>
      <AskPageContent />
    </Suspense>
  );
}
