"use client";
import { create } from "zustand";
import { mockGoals, type Goal } from "@/data/mock";

interface GoalStore {
  goals: Goal[];
  addGoal: (g: Omit<Goal, "id" | "currentAmount">) => void;
  addFunds: (id: string, amount: number) => void;
  removeGoal: (id: string) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: mockGoals,

  addGoal: (g) =>
    set((s) => ({
      goals: [...s.goals, { ...g, id: `g${Date.now()}`, currentAmount: 0 }],
    })),

  addFunds: (id, amount) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
          : g
      ),
    })),

  removeGoal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
}));
