"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryChip, } from "@/components/ui/CategoryChip";
import { useFinancialProfileStore, type SpendingCategory } from "@/store/useFinancialProfileStore";

const SPENDING_CATEGORIES: SpendingCategory[] = [
  "rent", "food", "transport", "entertainment", "bills", "shopping", "other",
];

const EMAIL_DATE = "22 Mar 2026, 09:41";

export default function OriginPage() {
  const router = useRouter();
  const { setProfile } = useFinancialProfileStore();

  const [primaryCats, setPrimaryCats] = useState<SpendingCategory[]>([]);
  const [impulseCats, setImpulseCats] = useState<SpendingCategory[]>([]);
  const [impulseAmounts, setImpulseAmounts] = useState<Partial<Record<SpendingCategory, string>>>({});
  const [budget, setBudget] = useState("");
  const [income, setIncome] = useState("");

  function togglePrimary(cat: SpendingCategory) {
    setPrimaryCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleImpulse(cat: SpendingCategory) {
    setImpulseCats((prev) => {
      if (prev.includes(cat)) {
        setImpulseAmounts((a) => { const next = { ...a }; delete next[cat]; return next; });
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  }

  const canSubmit =
    primaryCats.length > 0 &&
    parseFloat(budget) > 0 &&
    parseFloat(income) > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfile({
      primaryCategories: primaryCats,
      impulseCategories: impulseCats.map((cat) => ({
        category: cat,
        monthlyAmount: parseFloat(impulseAmounts[cat] || "0") || 0,
      })),
      monthlyBudget: parseFloat(budget),
      monthlyIncome: parseFloat(income),
    });
    router.push("/accounts");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        {/* Email client chrome */}
        <div className="bg-gray-800 border border-gray-700 rounded-t-2xl px-4 py-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-400/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-4 text-xs text-gray-500 font-mono">Mail — Inbox</span>
        </div>

        {/* Email body */}
        <div className="bg-gray-900 border border-t-0 border-gray-700 rounded-b-2xl overflow-hidden">
          {/* Header rows */}
          <div className="divide-y divide-gray-800 border-b border-gray-800 px-6 py-4 space-y-2">
            <div className="flex gap-3 pb-2">
              <span className="text-xs text-gray-600 w-14 pt-0.5 flex-shrink-0">From</span>
              <div>
                <span className="text-sm font-medium text-amber-400">Buddy Team</span>
                <span className="text-sm text-gray-500"> &lt;admin@buddy.mx&gt;</span>
              </div>
            </div>
            <div className="flex gap-3 py-2">
              <span className="text-xs text-gray-600 w-14 pt-0.5 flex-shrink-0">To</span>
              <span className="text-sm text-gray-400">you@student.ac.uk</span>
            </div>
            <div className="flex gap-3 py-2">
              <span className="text-xs text-gray-600 w-14 pt-0.5 flex-shrink-0">Subject</span>
              <span className="text-sm font-semibold text-gray-100">
                Complete your financial profile — it takes 2 minutes
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <span className="text-xs text-gray-600 w-14 pt-0.5 flex-shrink-0">Date</span>
              <span className="text-sm text-gray-500">{EMAIL_DATE}</span>
            </div>
          </div>

          {/* Email prose */}
          <div className="px-6 pt-6 pb-2">
            <p className="text-gray-100 font-medium mb-4">Hi there,</p>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Welcome to Buddy. To personalise your experience and build your financial portfolio,
              we need a few quick details about your spending habits and budget.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Fill in the form below — it only takes a couple of minutes and we&apos;ll use
              it to give you tailored insights and recommendations.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-8">
            {/* Section A: Primary spending */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1">
                What are your main spending categories?
              </label>
              <p className="text-xs text-gray-500 mb-3">Select everything that applies to your monthly spend.</p>
              <div className="flex flex-wrap gap-2">
                {SPENDING_CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    selected={primaryCats.includes(cat)}
                    onToggle={() => togglePrimary(cat)}
                  />
                ))}
              </div>
            </div>

            {/* Section B: Impulse purchases */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1">
                Where do you tend to overspend impulsively?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Optional — helps us flag patterns. Enter a rough monthly amount if you know it.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {SPENDING_CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    selected={impulseCats.includes(cat)}
                    onToggle={() => toggleImpulse(cat)}
                  />
                ))}
              </div>
              {impulseCats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {impulseCats.map((cat) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-24 truncate">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={impulseAmounts[cat] ?? ""}
                          onChange={(e) =>
                            setImpulseAmounts((prev) => ({ ...prev, [cat]: e.target.value }))
                          }
                          className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section C + D: Budget & Income */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  Expected monthly budget
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1200"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  Monthly take-home income
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                  bg-amber-400 text-gray-950 hover:bg-amber-300
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Build my portfolio
              </button>
              {!canSubmit && (
                <p className="text-xs text-gray-600 text-center mt-2">
                  Select at least one spending category and enter your budget and income to continue.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
