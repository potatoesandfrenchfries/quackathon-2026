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

const PIE_COLORS = ["#60A5FA","#34D399","#A78BFA","#FB923C","#F87171","#F472B6","#6B7280"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  fontSize: 12,
  color: "#F9FAFB",
};

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
        <h1 className="text-2xl font-bold text-gray-100">Budget &amp; Insights</h1>
        <p className="text-gray-500 text-sm mt-1">March 2026</p>
      </div>

      {overspentCategories.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-900/40 rounded-2xl">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Overspending detected</p>
            <p className="text-sm text-red-400/80 mt-0.5">
              {overspentCategories.map((b) => categoryConfig[b.category].label).join(", ")} exceeded budget this month.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="col-span-1 text-center">
          <p className="text-xs text-gray-500 font-medium">Total Budget</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">£{totalBudget}</p>
        </Card>
        <Card className="col-span-1 text-center">
          <p className="text-xs text-gray-500 font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">£{totalSpent.toFixed(0)}</p>
        </Card>
        <Card className="col-span-2 sm:col-span-1 text-center">
          <p className="text-xs text-gray-500 font-medium">Remaining</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">£{(totalBudget - totalSpent).toFixed(0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-semibold text-gray-100 mb-4">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={spendingPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {spendingPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, ""]} contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {spendingPie.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {entry.name}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-gray-100 mb-4">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockMonthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
              <Tooltip formatter={(v, n) => [`£${Number(v).toFixed(0)}`, n === "income" ? "Income" : "Spending"]} contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="income"   stroke="#34D399" strokeWidth={2} dot={{ r: 3 }} name="income"   />
              <Line type="monotone" dataKey="spending" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} name="spending" />
              <Legend formatter={(v) => v === "income" ? "Income" : "Spending"} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-100 mb-4">Budget vs Actual</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={budgetBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
            <Tooltip formatter={(v) => [`£${Number(v).toFixed(0)}`, ""]} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="budgeted" fill="#374151" radius={[4, 4, 0, 0]} name="Budgeted" />
            <Bar dataKey="spent"    fill="#60A5FA" radius={[4, 4, 0, 0]} name="Spent"    />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-3">
          {mockBudgets.map((b) => {
            const isOver = b.spent > b.budgeted;
            return (
              <div key={b.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {isOver
                      ? <AlertTriangle size={13} className="text-red-400" />
                      : <CheckCircle2 size={13} className="text-emerald-400" />
                    }
                    <span className="text-sm font-medium text-gray-300">{categoryConfig[b.category].label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={isOver ? "text-red-400 font-semibold" : "text-gray-300"}>£{b.spent}</span>
                    <span className="text-gray-600">/ £{b.budgeted}</span>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={b.budgeted} color={categoryConfig[b.category].color} size="sm" warn />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
