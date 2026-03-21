"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const WORRIES = ["rent", "student loans", "budgeting", "overdraft", "saving", "investing"];
const GOALS = ["save_emergency_fund", "pay_off_overdraft", "understand_student_loans", "start_investing", "budget_better"];
const GOAL_LABELS: Record<string, string> = {
  save_emergency_fund: "Build emergency fund",
  pay_off_overdraft: "Pay off overdraft",
  understand_student_loans: "Understand my student loans",
  start_investing: "Start investing",
  budget_better: "Budget better",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    university: "",
    income: "",
    expenses: "",
    top_worry: "",
    goals: [] as string[],
  });

  function toggleGoal(g: string) {
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g],
    }));
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await api.auth.onboarding({
        display_name: form.display_name || form.university || "Student",
        university: form.university || undefined,
        financial_snapshot: {
          income: Number(form.income) || undefined,
          expenses: Number(form.expenses) || undefined,
          top_worry: form.top_worry || undefined,
          goals: form.goals,
        },
      });
      router.push("/feed");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? "bg-amber-400" : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to Buddy</h2>
              <p className="text-gray-400 mt-1">Let's set up your profile</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your name</label>
                <input
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  placeholder="First name or nickname"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">University (optional)</label>
                <input
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. University of Manchester"
                  value={form.university}
                  onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.display_name}
              className="w-full py-3 bg-amber-400 text-gray-950 font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Quick financial snapshot</h2>
              <p className="text-gray-400 mt-1">Helps Buddy personalise advice for you</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Monthly income (£)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. 900"
                  value={form.income}
                  onChange={(e) => setForm((f) => ({ ...f, income: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Monthly expenses (£)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. 650"
                  value={form.expenses}
                  onChange={(e) => setForm((f) => ({ ...f, expenses: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Biggest financial worry</label>
                <div className="flex flex-wrap gap-2">
                  {WORRIES.map((w) => (
                    <button
                      key={w}
                      onClick={() => setForm((f) => ({ ...f, top_worry: w }))}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                        form.top_worry === w
                          ? "border-amber-400 bg-amber-400/10 text-amber-400"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:border-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-amber-400 text-gray-950 font-semibold rounded-lg hover:bg-amber-300 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">What do you want to achieve?</h2>
              <p className="text-gray-400 mt-1">Pick all that apply</p>
            </div>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGoal(g)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    form.goals.includes(g)
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  {form.goals.includes(g) ? "✓ " : "  "}
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:border-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-3 bg-amber-400 text-gray-950 font-semibold rounded-lg hover:bg-amber-300 disabled:opacity-40 transition-colors"
              >
                {loading ? "Setting up..." : "Go to Buddy →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
