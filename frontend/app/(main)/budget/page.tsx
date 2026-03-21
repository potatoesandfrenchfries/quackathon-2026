"use client";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { categoryConfig, mockBudgets, mockMonthlyTrend } from "@/data/mock";

const PIE_COLORS = ["#2563EB","#10B981","#8B5CF6","#F97316","#EF4444","#EC4899","#6B7280"];

const spendingPie = mockBudgets.map((b) => ({
  name: categoryConfig[b.category].label,
  value: b.spent,
}));

const budgetBarData = mockBudgets.map((b) => ({
  name: categoryConfig[b.category].label.replace(" & Drink", ""),
  budgeted: b.budgeted,
  spent: b.spent,
  over: b.spent > b.budgeted,
}));

export default function BudgetPage() {
  const totalBudget = mockBudgets.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent  = mockBudgets.reduce((s, b) => s + b.spent, 0);
  const overspentCategories = mockBudgets.filter((b) => b.spent > b.budgeted);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Budget & Insights</h1>
        <p className="text-slate-500 text-sm mt-1">March 2026</p>
      </div>

      {/* Alert banner */}
      {overspentCategories.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Overspending detected</p>
            <p className="text-sm text-red-600 mt-0.5">
              {overspentCategories.map((b) => categoryConfig[b.category].label).join(", ")} exceeded budget this month.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="col-span-1 text-center">
          <p className="text-xs text-slate-500 font-medium">Total Budget</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">£{totalBudget}</p>
        </Card>
        <Card className="col-span-1 text-center">
          <p className="text-xs text-slate-500 font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">£{totalSpent.toFixed(0)}</p>
        </Card>
        <Card className="col-span-2 sm:col-span-1 text-center">
          <p className="text-xs text-slate-500 font-medium">Remaining</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            £{(totalBudget - totalSpent).toFixed(0)}
          </p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending pie */}
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={spendingPie}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {spendingPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`£${Number(v).toFixed(2)}`, ""]}
                contentStyle={{ borderRadius: 12, border: "1px solid #F1F5F9", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {spendingPie.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly trend */}
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockMonthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
              <Tooltip
                formatter={(v, n) => [`£${Number(v).toFixed(0)}`, n === "income" ? "Income" : "Spending"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #F1F5F9", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="income"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="income"   />
              <Line type="monotone" dataKey="spending" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="spending" />
              <Legend
                formatter={(v) => v === "income" ? "Income" : "Spending"}
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Budget vs actual */}
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Budget vs Actual</h2>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={budgetBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
            <Tooltip
              formatter={(v) => [`£${Number(v).toFixed(0)}`, ""]}
              contentStyle={{ borderRadius: 12, border: "1px solid #F1F5F9", fontSize: 12 }}
            />
            <Bar dataKey="budgeted" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Budgeted" />
            <Bar dataKey="spent"    fill="#2563EB" radius={[4, 4, 0, 0]} name="Spent"    />
          </BarChart>
        </ResponsiveContainer>

        {/* Progress rows */}
        <div className="mt-4 space-y-3">
          {mockBudgets.map((b) => {
            const isOver = b.spent > b.budgeted;
            return (
              <div key={b.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isOver
                      ? <AlertTriangle size={13} className="text-red-500" />
                      : <CheckCircle2 size={13} className="text-emerald-500" />
                    }
                    <span className="text-sm font-medium text-slate-700">
                      {categoryConfig[b.category].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={isOver ? "text-red-600 font-semibold" : "text-slate-600"}>
                      £{b.spent}
                    </span>
                    <span className="text-slate-400">/ £{b.budgeted}</span>
                  </div>
                </div>
                <ProgressBar
                  value={b.spent}
                  max={b.budgeted}
                  color={categoryConfig[b.category].color}
                  size="sm"
                  warn
                />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
