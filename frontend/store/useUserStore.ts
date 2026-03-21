"use client";
import { create } from "zustand";
import { mockUser } from "@/data/mock";

type User = typeof mockUser;

interface UserStore {
  user: User;
  addXP: (delta: number) => void;
  resetStreak: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: mockUser,

  addXP: (delta) =>
    set((s) => ({
      user: {
        ...s.user,
        gamification: {
          ...s.user.gamification,
          xp: Math.min(s.user.gamification.xpToNext, s.user.gamification.xp + delta),
          totalXpEarned: s.user.gamification.totalXpEarned + delta,
        },
      },
    })),

  resetStreak: () =>
    set((s) => ({
      user: {
        ...s.user,
        gamification: { ...s.user.gamification, streak: 0 },
      },
    })),
}));
