"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, PiggyBank, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import type { Goal } from "@/types/database";

const GOAL_COLORS = [
  { label: "Blue",   value: "blue",   hex: "#60A5FA" },
  { label: "Green",  value: "green",  hex: "#34D399" },
  { label: "Violet", value: "violet", hex: "#A78BFA" },
  { label: "Orange", value: "orange", hex: "#FB923C" },
  { label: "Pink",   value: "pink",   hex: "#F472B6" },
];

const COLOR_HEX: Record<string, string> = Object.fromEntries(
  GOAL_COLORS.map((c) => [c.value, c.hex])
);

function GoalCard({
  goal,
  onProgress,
  onDelete,
}: {
  goal: Goal;
  onProgress: (id: string, amount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const completed = goal.current_amount >= goal.target_amount;
  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000)
  );
  const hex = COLOR_HEX[goal.color] ?? "#60A5FA";

  async function handleAdd() {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setSubmitting(true);
    await onProgress(goal.id, n);
    setAmount("");
    setAdding(false);
    setSubmitting(false);
  }

  return (
    <Card className={`relative overflow-hidden ${completed ? "ring-1 ring-emerald-500/50" : ""}`}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: hex }} />

      <div className="flex items-start justify-between mt-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{goal.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-100">{goal.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {completed
                ? "🎉 Completed!"
                : `${daysLeft} days left · Due ${new Date(goal.deadline).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
              }
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-gray-700 hover:text-red-400 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-gray-100">£{goal.current_amount.toFixed(0)}</span>
          <span className="text-gray-500">£{goal.target_amount.toFixed(0)}</span>
        </div>
        <ProgressBar value={goal.current_amount} max={goal.target_amount} color={hex} size="lg" />
        <p className="text-xs text-gray-600 mt-1.5">{pct}% saved</p>
      </div>

      {!completed && (
        <div className="mt-4">
          {adding ? (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="£0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <Button size="sm" onClick={handleAdd} disabled={submitting}>
                {submitting ? "…" : "Add"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2 text-sm font-medium rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-amber-400 hover:text-amber-400 transition-colors"
            >
              + Add funds
            </button>
          )}
        </div>
      )}

      {completed && (
        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
          <CheckCircle2 size={16} />
          Goal reached!
        </div>
      )}
    </Card>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", emoji: "🎯", target_amount: "", deadline: "",
    color: "blue", is_shared: false,
  });

  const load = useCallback(async () => {
    try {
      const data = await api.goals.list();
      setGoals(data);
    } catch {
      // keep empty — no mock data for goals
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.title || !form.target_amount || !form.deadline) return;
    setSubmitting(true);
    try {
      const goal = await api.goals.create({
        title: form.title,
        emoji: form.emoji,
        color: form.color,
        target_amount: parseFloat(form.target_amount),
        deadline: form.deadline,
        is_shared: form.is_shared,
      });
      setGoals((prev) => [goal, ...prev]);
      setModalOpen(false);
      setForm({ title: "", emoji: "🎯", target_amount: "", deadline: "", color: "blue", is_shared: false });
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProgress(id: string, amount: number) {
    try {
      const result = await api.goals.addProgress(id, amount);
      setGoals((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, current_amount: result.current_amount }
            : g
        )
      );
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.goals.delete(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch {
      // silently fail
    }
  }

  const active    = goals.filter((g) => g.current_amount < g.target_amount);
  const completed = goals.filter((g) => g.current_amount >= g.target_amount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Savings Goals</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Loading…" : `${active.length} active · ${completed.length} completed`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Goal
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-16">
          <PiggyBank size={48} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">No goals yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first savings goal to get started</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create a goal
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onProgress={handleProgress} onDelete={handleDelete} />
            ))}
          </div>
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {completed.map((g) => (
                  <GoalCard key={g.id} goal={g} onProgress={handleProgress} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Savings Goal">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={2}
                className="w-full px-3 py-2.5 text-center text-xl bg-gray-800 border border-gray-700 text-gray-100 rounded-xl focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Goal name</label>
              <input
                type="text"
                placeholder="e.g. New Laptop"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
              <input
                type="number"
                placeholder="0.00"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                className="w-full pl-7 pr-4 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target date</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 rounded-xl focus:outline-none focus:border-amber-400 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Colour</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-offset-gray-900" : ""}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.is_shared}
                onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.is_shared ? "bg-amber-400" : "bg-gray-700"}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.is_shared ? "translate-x-5" : ""}`} />
            </div>
            <div>
              <span className="text-sm text-gray-300 font-medium">Share publicly</span>
              <p className="text-xs text-gray-600">Let other students see your goal for accountability</p>
            </div>
          </label>

          <Button className="w-full mt-2" onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : "Create Goal"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
