"use client";
import { create } from "zustand";
import type { Category } from "@/data/mock";

export type SpendingCategory = Exclude<Category, "income">;

export interface ImpulseCategory {
  category: SpendingCategory;
  monthlyAmount: number;
}

interface FinancialProfile {
  primaryCategories: SpendingCategory[];
  impulseCategories: ImpulseCategory[];
  monthlyBudget: number;
  monthlyIncome: number;
  completedAt: string | null;
}

interface FinancialProfileStore {
  profile: FinancialProfile;
  setProfile: (p: Omit<FinancialProfile, "completedAt">) => void;
  isComplete: () => boolean;
}

const initialProfile: FinancialProfile = {
  primaryCategories: [],
  impulseCategories: [],
  monthlyBudget: 0,
  monthlyIncome: 0,
  completedAt: null,
};

export const useFinancialProfileStore = create<FinancialProfileStore>((set, get) => ({
  profile: initialProfile,

  setProfile: (p) =>
    set({ profile: { ...p, completedAt: new Date().toISOString() } }),

  isComplete: () => get().profile.completedAt !== null,
}));
