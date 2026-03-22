"use client";
import Link from "next/link";
import { Mail, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useFinancialProfileStore } from "@/store/useFinancialProfileStore";
import { categoryConfig } from "@/data/mock";

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  fontSize: 12,
  color: "#F9FAFB",
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function healthLabel(score: number) {
  if (score < 34) return "Poor";
  if (score < 60) return "Fair";
  if (score < 80) return "Good";
  return "Excellent";
}

function healthColor(score: number) {
  if (score < 34) return "#F87171";
  if (score < 67) return "#FB923C";
  return "#34D399";
}

export default function AccountsPage() {
  const { profile, isComplete } = useFinancialProfileStore();

  if (!isComplete()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 mx-auto mb-4">
            <Mail className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Complete your financial profile</h2>
          <p className="text-sm text-gray-500 mb-6">
            We sent you an email from <span className="text-amber-400">admin@buddy.mx</span> with a short
            form. Fill it in to unlock your personal financial portfolio.
          </p>
          <Link
            href="/origin"
            className="inline-block px-6 py-3 bg-amber-400 text-gray-950 font-semibold text-sm rounded-xl hover:bg-amber-300 transition-colors"
          >
            Open the email
          </Link>
        </Card>
      </div>
    );
  }

  const { primaryCategories, impulseCategories, monthlyBudget, monthlyIncome } = profile;

  const savings = monthlyIncome - monthlyBudget;
  const savingsRate = monthlyIncome > 0
    ? clamp(Math.round((savings / monthlyIncome) * 100), 0, 100)
    : 0;

  const totalImpulse = impulseCategories.reduce((s, c) => s + c.monthlyAmount, 0);
  const impulsePenalty = monthlyBudget > 0
    ? Math.min(50, (totalImpulse / monthlyBudget) * 100)
    : 0;
  const healthScore = clamp(Math.round(savingsRate - impulsePenalty), 0, 100);

  const pieData = primaryCategories.map((cat) => ({
    name: categoryConfig[cat].label,
    value: Math.round(monthlyBudget / primaryCategories.length),
    color: categoryConfig[cat].color,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Financial Portfolio</h1>
          <p className="text-gray-500 text-sm">Built from your profile — sourced from admin@buddy.mx</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Monthly Income</p>
          <p className="text-2xl font-bold text-gray-100 mt-2">£{monthlyIncome.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-emerald-400 text-xs mt-1">
            <TrendingUp size={12} />
            <span>Take-home pay</span>
          </div>
        </Card>

        <Card>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Monthly Budget</p>
          <p className="text-2xl font-bold text-gray-100 mt-2">£{monthlyBudget.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-blue-400 text-xs mt-1">
            <Wallet size={12} />
            <span>Planned spend</span>
          </div>
        </Card>

        <Card>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Est. Savings</p>
          <p className={`text-2xl font-bold mt-2 ${savings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {savings >= 0 ? "+" : ""}£{savings.toFixed(2)}
          </p>
          <div className={`flex items-center gap-1 text-xs mt-1 ${savings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {savings >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{savings >= 0 ? "Surplus" : "Deficit"} per month</span>
          </div>
        </Card>

        <Card>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Savings Rate</p>
          <p className={`text-2xl font-bold mt-2 ${savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 10 ? "text-amber-400" : "text-red-400"}`}>
            {savingsRate}%
          </p>
          <ProgressBar
            value={savingsRate}
            max={100}
            color={savingsRate >= 20 ? "#34D399" : savingsRate >= 10 ? "#FBBF24" : "#F87171"}
            className="mt-2"
            size="sm"
          />
        </Card>
      </div>

      {/* Middle row: Spending allocation + Health score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-100 mb-1">Spending Allocation</h2>
          <p className="text-xs text-gray-600 mb-4">Estimated equal split across your primary categories.</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div style={{ width: "100%", maxWidth: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`£${Number(v).toFixed(2)}`, ""]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-400 flex-1 truncate">{entry.name}</span>
                  <span className="text-sm font-medium text-gray-200">£{entry.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1 flex flex-col">
          <h2 className="text-base font-semibold text-gray-100 mb-4">Budget Health Score</h2>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div
              className="w-28 h-28 rounded-full border-4 flex items-center justify-center"
              style={{ borderColor: healthColor(healthScore) }}
            >
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: healthColor(healthScore) }}>
                  {healthScore}
                </p>
                <p className="text-xs text-gray-500">/ 100</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: healthColor(healthScore) }}>
                {healthLabel(healthScore)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Based on savings rate & impulse spend
              </p>
            </div>
            <ProgressBar
              value={healthScore}
              max={100}
              color={healthColor(healthScore)}
              size="md"
              className="w-full"
            />
          </div>
          {totalImpulse > 0 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-400/5 border border-amber-400/15 rounded-xl">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                £{totalImpulse.toFixed(0)}/mo in impulse spending is affecting your score.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Impulse Spending Tracker */}
      {impulseCategories.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-100 mb-3">Impulse Spending Tracker</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {impulseCategories.map(({ category, monthlyAmount }) => {
              const cfg = categoryConfig[category];
              const pct = monthlyBudget > 0
                ? Math.min(100, Math.round((monthlyAmount / monthlyBudget) * 100))
                : 0;
              const saving = monthlyAmount / 2;
              return (
                <Card key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-sm font-medium text-gray-200">{cfg.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-100 mb-1">
                    ~£{monthlyAmount > 0 ? monthlyAmount.toFixed(2) : "—"}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                  {monthlyAmount > 0 && (
                    <p className="text-xs text-emerald-400 mb-3">
                      Cut 50% → save £{saving.toFixed(2)}/mo
                    </p>
                  )}
                  <ProgressBar
                    value={pct}
                    max={100}
                    color={cfg.color}
                    size="sm"
                    showPercent
                    label="% of budget"
                    warn={pct > 20}
                  />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {impulseCategories.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-gray-500 text-sm">No impulse spending categories tracked.</p>
          <Link href="/origin" className="text-amber-400 text-sm hover:underline mt-1 inline-block">
            Update your profile
          </Link>
        </Card>
      )}
    </div>
  );
}
