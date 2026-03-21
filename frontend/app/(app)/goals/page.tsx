"use client";
import { useState } from "react";
import { Plus, Trash2, PiggyBank, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { useGoalStore } from "@/store/useGoalStore";
import { useUserStore } from "@/store/useUserStore";
import { type Goal } from "@/data/mock";

const GOAL_COLORS = [
  { label: "Blue",   value: "blue",   hex: "#2563EB" },
  { label: "Green",  value: "green",  hex: "#10B981" },
  { label: "Violet", value: "violet", hex: "#8B5CF6" },
  { label: "Orange", value: "orange", hex: "#F97316" },
  { label: "Pink",   value: "pink",   hex: "#EC4899" },
];

const colorHex = (c: string) => GOAL_COLORS.find((x) => x.value === c)?.hex ?? "#2563EB";

function GoalCard({ goal }: { goal: Goal }) {
  const { addFunds, removeGoal } = useGoalStore();
  const { addXP } = useUserStore();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const completed = goal.currentAmount >= goal.targetAmount;
  const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000)
  );

  function handleAdd() {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    addFunds(goal.id, n);
    addXP(15);
    setAmount("");
    setAdding(false);
  }

  return (
    <Card className={`relative overflow-hidden ${completed ? "ring-2 ring-emerald-400" : ""}`}>
      {/* Colour accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: colorHex(goal.color) }} />

      <div className="flex items-start justify-between mt-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{goal.emoji}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{goal.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {completed
                ? "🎉 Completed!"
                : `${daysLeft} days left · Due ${new Date(goal.deadline).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
              }
            </p>
          </div>
        </div>
        <button
          onClick={() => removeGoal(goal.id)}
          className="text-slate-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-slate-900">£{goal.currentAmount.toFixed(0)}</span>
          <span className="text-slate-400">£{goal.targetAmount.toFixed(0)}</span>
        </div>
        <ProgressBar
          value={goal.currentAmount}
          max={goal.targetAmount}
          color={colorHex(goal.color)}
          size="lg"
        />
        <p className="text-xs text-slate-500 mt-1.5">{pct}% saved</p>
      </div>

      {/* Add funds */}
      {!completed && (
        <div className="mt-4">
          {adding ? (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="£0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary"
                autoFocus
              />
              <Button size="sm" onClick={handleAdd}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2 text-sm font-medium rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-brand-secondary hover:text-brand-secondary transition-colors"
            >
              + Add funds
            </button>
          )}
        </div>
      )}

      {completed && (
        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
          <CheckCircle2 size={16} />
          Goal reached!
        </div>
      )}
    </Card>
  );
}

export default function GoalsPage() {
  const { goals, addGoal } = useGoalStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", emoji: "🎯", targetAmount: "", deadline: "", color: "blue",
  });

  function handleCreate() {
    if (!form.name || !form.targetAmount || !form.deadline) return;
    addGoal({
      name: form.name,
      emoji: form.emoji,
      targetAmount: parseFloat(form.targetAmount),
      deadline: form.deadline,
      color: form.color,
    });
    setModalOpen(false);
    setForm({ name: "", emoji: "🎯", targetAmount: "", deadline: "", color: "blue" });
  }

  const completed = goals.filter((g) => g.currentAmount >= g.targetAmount);
  const active     = goals.filter((g) => g.currentAmount < g.targetAmount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
          <p className="text-slate-500 text-sm mt-1">{active.length} active · {completed.length} completed</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="text-center py-16">
          <PiggyBank size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No goals yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first savings goal to get started</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create a goal
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create goal modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Savings Goal">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={2}
                className="w-full px-3 py-2.5 text-center text-xl border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Goal name</label>
              <input
                type="text"
                placeholder="e.g. New Laptop"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Target amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
              <input
                type="number"
                placeholder="0.00"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="w-full pl-7 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Target date</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Colour</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c.value ? "ring-2 ring-offset-2" : ""}`}
                  style={{ backgroundColor: c.hex, outlineColor: form.color === c.value ? c.hex : undefined }}
                />
              ))}
            </div>
          </div>

          <Button className="w-full mt-2" onClick={handleCreate}>
            Create Goal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
