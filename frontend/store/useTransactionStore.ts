"use client";
import { create } from "zustand";
import { mockTransactions, type Transaction, type Category } from "@/data/mock";

interface Filters {
  search: string;
  type: "all" | "income" | "expense";
  category: Category | "all";
}

interface TransactionStore {
  transactions: Transaction[];
  filters: Filters;
  setFilter: (patch: Partial<Filters>) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  filtered: () => Transaction[];
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: mockTransactions,
  filters: { search: "", type: "all", category: "all" },

  setFilter: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  addTransaction: (t) =>
    set((s) => ({
      transactions: [
        { ...t, id: `t${Date.now()}` },
        ...s.transactions,
      ],
    })),

  filtered: () => {
    const { transactions, filters } = get();
    return transactions.filter((t) => {
      if (filters.type === "income"  && t.amount <= 0) return false;
      if (filters.type === "expense" && t.amount >= 0) return false;
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  },
}));
