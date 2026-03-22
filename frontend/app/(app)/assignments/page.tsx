"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, BookOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Assignment, AssignmentDifficulty } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  easy:   { label: "Easy",   delta: "+5",  color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", bar: "bg-emerald-400" },
  medium: { label: "Medium", delta: "+10", color: "text-amber-400 bg-amber-400/10 border-amber-400/30",       bar: "bg-amber-400"   },
  hard:   { label: "Hard",   delta: "+20", color: "text-red-400 bg-red-400/10 border-red-400/30",             bar: "bg-red-400"     },
} as const;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate + "T00:00:00") < today;
}

function isDueThisWeek(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const d = new Date(dueDate + "T00:00:00");
  return d >= today && d <= weekEnd;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── AssignmentCard ───────────────────────────────────────────────────────────

function AssignmentCard({
  assignment,
  onStatusChange,
  onComplete,
  onDelete,
}: {
  assignment: Assignment;
  onStatusChange: (id: string, status: "todo" | "in_progress") => Promise<void>;
  onComplete: (id: string) => Promise<{ credibility_awarded: number }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);

  const diff = DIFFICULTY_CONFIG[assignment.difficulty];
  const done = assignment.status === "completed";
  const overdue = !done && isOverdue(assignment.due_date);
  const thisWeek = !done && !overdue && isDueThisWeek(assignment.due_date);

  async function handleComplete() {
    setLoading(true);
    const result = await onComplete(assignment.id);
    setCelebration(`+${result.credibility_awarded} credibility`);
    setTimeout(() => setCelebration(null), 3000);
    setLoading(false);
  }

  return (
    <div className={`relative rounded-2xl bg-gray-900 border border-gray-800 p-4 transition-opacity ${done ? "opacity-60" : ""}`}>
      {/* Difficulty accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${diff.bar}`} />

      <div className="flex items-start justify-between mt-1">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-gray-100 truncate text-sm">{assignment.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{assignment.subject}</p>
        </div>
        <button
          onClick={() => onDelete(assignment.id)}
          className="text-gray-700 hover:text-red-400 transition-colors shrink-0 p-0.5"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${diff.color}`}>
          {diff.label} {diff.delta}
        </span>
        <span className={`text-xs flex items-center gap-1 ${
          overdue ? "text-red-400" : thisWeek ? "text-amber-400" : "text-gray-500"
        }`}>
          {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
          {done
            ? `Done ${assignment.completed_at ? formatDate(assignment.completed_at.slice(0, 10)) : ""}`
            : `Due ${formatDate(assignment.due_date)}`
          }
        </span>
      </div>

      {/* Actions */}
      {!done && (
        <div className="mt-4 flex gap-2">
          {assignment.status === "todo" && (
            <button
              onClick={() => onStatusChange(assignment.id, "in_progress")}
              disabled={loading}
              className="flex-1 py-1.5 rounded-xl text-xs font-medium border border-dashed border-gray-700 text-gray-400 hover:border-amber-400 hover:text-amber-400 transition-colors disabled:opacity-40"
            >
              Start
            </button>
          )}
          {assignment.status === "in_progress" && (
            <>
              <button
                onClick={() => onStatusChange(assignment.id, "todo")}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-40"
              >
                Pause
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 py-1.5 rounded-xl text-xs font-medium bg-amber-400 text-gray-950 hover:bg-amber-300 transition-colors disabled:opacity-40"
              >
                {loading ? "…" : "Mark Done"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Celebration flash */}
      {celebration && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-400 text-xs font-medium">
          <CheckCircle2 size={14} />
          {celebration}
        </div>
      )}
      {done && !celebration && (
        <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <CheckCircle2 size={14} />
          Completed
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function Section({ label, count, color = "text-gray-600", children }: {
  label: string;
  count: number;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</h2>
        <span className="text-xs text-gray-700">{count}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    due_date: "",
    difficulty: "medium" as AssignmentDifficulty,
  });

  const load = useCallback(async () => {
    try {
      const data = await api.assignments.list();
      setAssignments(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.title || !form.subject || !form.due_date) return;
    setSubmitting(true);
    try {
      const a = await api.assignments.create({
        title:      form.title,
        subject:    form.subject,
        due_date:   form.due_date,
        difficulty: form.difficulty,
      });
      setAssignments((prev) => [a, ...prev]);
      setModalOpen(false);
      setForm({ title: "", subject: "", due_date: "", difficulty: "medium" });
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: "todo" | "in_progress") {
    try {
      const updated = await api.assignments.updateStatus(id, status);
      setAssignments((prev) => prev.map((a) => a.id === id ? updated : a));
    } catch {
      // silently fail
    }
  }

  async function handleComplete(id: string) {
    const result = await api.assignments.complete(id);
    setAssignments((prev) =>
      prev.map((a) => a.id === id
        ? { ...a, status: "completed" as const, completed_at: new Date().toISOString() }
        : a
      )
    );
    return result;
  }

  async function handleDelete(id: string) {
    try {
      await api.assignments.delete(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail
    }
  }

  // ── Grouping ─────────────────────────────────────────────────────────────

  const active   = assignments.filter((a) => a.status !== "completed");
  const overdue  = active.filter((a) => isOverdue(a.due_date));
  const thisWeek = active.filter((a) => !isOverdue(a.due_date) && isDueThisWeek(a.due_date));
  const upcoming = active.filter((a) => !isOverdue(a.due_date) && !isDueThisWeek(a.due_date));
  const done     = assignments.filter((a) => a.status === "completed");

  const cardProps = {
    onStatusChange: handleStatusChange,
    onComplete:     handleComplete,
    onDelete:       handleDelete,
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Loading…" : `${active.length} pending · ${done.length} completed`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-gray-950 font-medium text-sm hover:bg-amber-300 transition-colors"
        >
          <Plus size={16} /> Add Assignment
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && assignments.length === 0 && (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-16 text-center">
          <BookOpen size={48} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">No assignments yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Track your coursework and earn credibility for completing it
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-gray-950 font-medium text-sm hover:bg-amber-300 transition-colors mx-auto"
          >
            <Plus size={16} /> Add your first assignment
          </button>
        </div>
      )}

      {/* Grouped sections */}
      {!loading && assignments.length > 0 && (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <Section label="Overdue" count={overdue.length} color="text-red-500">
              {overdue.map((a) => <AssignmentCard key={a.id} assignment={a} {...cardProps} />)}
            </Section>
          )}
          {thisWeek.length > 0 && (
            <Section label="Due This Week" count={thisWeek.length} color="text-amber-500">
              {thisWeek.map((a) => <AssignmentCard key={a.id} assignment={a} {...cardProps} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section label="Upcoming" count={upcoming.length}>
              {upcoming.map((a) => <AssignmentCard key={a.id} assignment={a} {...cardProps} />)}
            </Section>
          )}
          {done.length > 0 && (
            <Section label="Completed" count={done.length}>
              {done.map((a) => <AssignmentCard key={a.id} assignment={a} {...cardProps} />)}
            </Section>
          )}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-100">New Assignment</h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Title</label>
              <input
                type="text"
                placeholder="e.g. Financial Economics Essay"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-xl focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Module / Subject</label>
              <input
                type="text"
                placeholder="e.g. ECO2001 Macroeconomics"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-xl focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-100 rounded-xl focus:outline-none focus:border-amber-400 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setForm({ ...form, difficulty: d })}
                      className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                        form.difficulty === d
                          ? cfg.color
                          : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {cfg.label}
                      <span className="block text-[10px] mt-0.5 opacity-70">{cfg.delta} cred</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting || !form.title || !form.subject || !form.due_date}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-gray-950 font-medium text-sm hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : "Add Assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
