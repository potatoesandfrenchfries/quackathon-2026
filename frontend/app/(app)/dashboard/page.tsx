"use client";
import {
  TrendingUp, Flame, Zap, Star,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CategoryBadge } from "@/components/ui/Badge";
import { useUserStore } from "@/store/useUserStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useGoalStore } from "@/store/useGoalStore";
import { categoryConfig, formatCurrency, formatDate } from "@/data/mock";

const PIE_COLORS = ["#60A5FA","#34D399","#A78BFA","#FB923C","#F87171","#F472B6","#6B7280"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  fontSize: 12,
  color: "#F9FAFB",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useUserStore();
  const { transactions } = useTransactionStore();
  const { goals } = useGoalStore();

  const income  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expense;
  const savingsPct = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const categoryTotals: Record<string, number> = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Math.abs(t.amount);
  });
  const pieData = Object.entries(categoryTotals)
    .map(([cat, val]) => ({ name: categoryConfig[cat as keyof typeof categoryConfig]?.label ?? cat, value: val }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const recent = transactions.slice(0, 5);
  const { level, xp, xpToNext, streak, totalXpEarned } = user.gamification;
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          {greeting()}, {user.displayName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-amber-400 p-6 col-span-1 relative overflow-hidden">
          <p className="text-gray-950/60 text-sm font-medium">Current Balance</p>
          <p className="text-4xl font-bold mt-2 mb-1 text-gray-950">£{balance.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-gray-950/70 text-sm">
            <TrendingUp size={14} />
            <span>+£320 from last month</span>
          </div>
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gray-950/10" />
        </div>

        <Card className="col-span-1">
          <p className="text-gray-500 text-sm font-medium">Spent This Month</p>
          <p className="text-3xl font-bold text-gray-100 mt-2 mb-1">£{expense.toFixed(2)}</p>
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <ArrowDownRight size={14} />
            <span>of £{user.finance.monthlyBudget} budget</span>
          </div>
          <ProgressBar value={expense} max={user.finance.monthlyBudget} color="#60A5FA" className="mt-3" size="sm" warn />
        </Card>

        <Card className="col-span-1">
          <p className="text-gray-500 text-sm font-medium">Savings Rate</p>
          <p className="text-3xl font-bold text-gray-100 mt-2 mb-1">{savingsPct}%</p>
          <div className="flex items-center gap-1 text-emerald-400 text-sm">
            <TrendingUp size={14} />
            <span>£{(income - expense).toFixed(2)} saved</span>
          </div>
          <ProgressBar value={savingsPct} max={100} color="#34D399" className="mt-3" size="sm" />
        </Card>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-100 mb-4">Spending Breakdown</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div style={{ width: "100%", maxWidth: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, ""]} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-400 flex-1 truncate">{entry.name}</span>
                  <span className="text-sm font-medium text-gray-200">£{entry.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-gray-100">Your Progress</h2>

          <div className="flex items-center gap-3 p-3 bg-orange-950/40 border border-orange-900/30 rounded-xl">
            <div className="w-10 h-10 bg-orange-950/60 rounded-xl flex items-center justify-center">
              <Flame size={20} className="text-orange-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-100">{streak} days</div>
              <div className="text-xs text-gray-500">Current streak</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Star size={15} className="text-amber-400" />
                <span className="text-sm font-semibold text-gray-100">Level {level}</span>
              </div>
              <span className="text-xs text-gray-500">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
            </div>
            <ProgressBar value={xp} max={xpToNext} color="#FBBF24" size="md" />
            <p className="text-xs text-gray-600 mt-1">{xpToNext - xp} XP to Level {level + 1}</p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-950/40 border border-blue-900/30 rounded-xl">
            <div className="w-10 h-10 bg-blue-950/60 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-100">{totalXpEarned.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total XP earned</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Goals */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-100">Savings Goals</h2>
          <a href="/goals" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View all <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-sm font-semibold text-gray-100 truncate">{g.name}</span>
              </div>
              <ProgressBar value={g.currentAmount} max={g.targetAmount} color="#34D399" size="sm" className="mb-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>£{g.currentAmount}</span>
                <span>£{g.targetAmount}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent transactions */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-100">Recent Transactions</h2>
          <a href="/transactions" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View all <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="divide-y divide-gray-800">
          {recent.map((t) => {
            const isIncome = t.amount > 0;
            return (
              <div key={t.id} className="flex items-center gap-4 py-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: categoryConfig[t.category].bg }}
                >
                  {isIncome ? "💰" : "💳"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CategoryBadge category={t.category} />
                    <span className="text-xs text-gray-600">{formatDate(t.date)}</span>
                  </div>
                </div>
                <div className={`text-sm font-semibold flex-shrink-0 ${isIncome ? "text-emerald-400" : "text-gray-300"}`}>
                  {isIncome ? "+" : ""}{formatCurrency(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
