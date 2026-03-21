// ─── Types ───────────────────────────────────────────────────────────────────

export type Category =
  | "rent"
  | "food"
  | "transport"
  | "entertainment"
  | "bills"
  | "shopping"
  | "income"
  | "other";

export interface Transaction {
  id: string;
  date: string; // ISO
  description: string;
  amount: number; // negative = expense, positive = income
  category: Category;
  merchant?: string;
}

export interface Budget {
  category: Category;
  budgeted: number;
  spent: number;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO date
  color: string;    // tailwind bg class
}

export interface MonthlyPoint {
  month: string;
  spending: number;
  income: number;
}

// ─── Category config ─────────────────────────────────────────────────────────

export const categoryConfig: Record<
  Category,
  { label: string; color: string; bg: string; dot: string }
> = {
  rent:          { label: "Rent",          color: "#2563EB", bg: "#EFF6FF", dot: "bg-blue-600"    },
  food:          { label: "Food & Drink",  color: "#10B981", bg: "#ECFDF5", dot: "bg-emerald-500" },
  transport:     { label: "Transport",     color: "#8B5CF6", bg: "#F5F3FF", dot: "bg-violet-500"  },
  entertainment: { label: "Entertainment", color: "#F97316", bg: "#FFF7ED", dot: "bg-orange-500"  },
  bills:         { label: "Bills",         color: "#EF4444", bg: "#FEF2F2", dot: "bg-red-500"     },
  shopping:      { label: "Shopping",      color: "#EC4899", bg: "#FDF2F8", dot: "bg-pink-500"    },
  income:        { label: "Income",        color: "#059669", bg: "#ECFDF5", dot: "bg-emerald-600" },
  other:         { label: "Other",         color: "#6B7280", bg: "#F9FAFB", dot: "bg-gray-400"    },
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const mockUser = {
  id: "user-001",
  username: "alice_m",
  displayName: "Alice",
  fullName: "Alice Mensah",
  university: "University of Manchester",
  avatarInitials: "AM",
  joinedDate: "2024-09-01",
  credibility: {
    total: 450,
    tier: "contributor" as const,
    tierColor: "#10B981",
    topTopics: [
      { topic: "budgeting", score: 180 },
      { topic: "loans", score: 140 },
      { topic: "rent", score: 130 },
    ],
  },
  gamification: {
    level: 7,
    xp: 2340,
    xpToNext: 3000,
    streak: 14,
    totalXpEarned: 5840,
    badges: ["Early Adopter", "Budget Master", "Streak King"],
  },
  finance: {
    monthlyIncome: 1480,
    monthlyBudget: 1200,
    currentBalance: 430,
    savingsRate: 22,
  },
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const mockTransactions: Transaction[] = [
  { id: "t1",  date: "2026-03-21", description: "Tesco Groceries",      amount: -34.50, category: "food",          merchant: "Tesco"           },
  { id: "t2",  date: "2026-03-21", description: "Monthly Bus Pass",     amount: -45.00, category: "transport",     merchant: "TfGM"            },
  { id: "t3",  date: "2026-03-20", description: "Student Loan",         amount: 1200.00, category: "income",       merchant: "SLC"             },
  { id: "t4",  date: "2026-03-20", description: "Part-time Shift",      amount: 280.00, category: "income",        merchant: "Costa Coffee"    },
  { id: "t5",  date: "2026-03-19", description: "Rent — March",         amount: -625.00, category: "rent",         merchant: "Landlord"        },
  { id: "t6",  date: "2026-03-18", description: "Deliveroo",            amount: -18.50, category: "food",          merchant: "Deliveroo"       },
  { id: "t7",  date: "2026-03-17", description: "Spotify Premium",      amount: -9.99,  category: "entertainment", merchant: "Spotify"         },
  { id: "t8",  date: "2026-03-17", description: "Netflix",              amount: -15.99, category: "entertainment", merchant: "Netflix"         },
  { id: "t9",  date: "2026-03-16", description: "ASOS",                 amount: -67.00, category: "shopping",      merchant: "ASOS"            },
  { id: "t10", date: "2026-03-15", description: "Costa Coffee",         amount: -4.20,  category: "food",          merchant: "Costa"           },
  { id: "t11", date: "2026-03-15", description: "Gym Membership",       amount: -25.00, category: "bills",         merchant: "PureGym"         },
  { id: "t12", date: "2026-03-14", description: "Amazon Prime",         amount: -8.99,  category: "entertainment", merchant: "Amazon"          },
  { id: "t13", date: "2026-03-13", description: "Aldi Groceries",       amount: -28.40, category: "food",          merchant: "Aldi"            },
  { id: "t14", date: "2026-03-12", description: "Gas & Electric",       amount: -62.00, category: "bills",         merchant: "British Gas"     },
  { id: "t15", date: "2026-03-11", description: "H&M",                  amount: -42.00, category: "shopping",      merchant: "H&M"             },
  { id: "t16", date: "2026-03-10", description: "Pret A Manger",        amount: -7.50,  category: "food",          merchant: "Pret"            },
  { id: "t17", date: "2026-03-09", description: "Uber",                 amount: -12.40, category: "transport",     merchant: "Uber"            },
  { id: "t18", date: "2026-03-08", description: "Student Union Bar",    amount: -23.00, category: "entertainment", merchant: "SU"              },
  { id: "t19", date: "2026-03-07", description: "Internet — March",     amount: -29.99, category: "bills",         merchant: "Virgin Media"    },
  { id: "t20", date: "2026-03-06", description: "Boots",                amount: -14.50, category: "shopping",      merchant: "Boots"           },
];

// ─── Budgets ─────────────────────────────────────────────────────────────────

export const mockBudgets: Budget[] = [
  { category: "rent",          budgeted: 625, spent: 625  },
  { category: "food",          budgeted: 200, spent: 93   },
  { category: "transport",     budgeted: 60,  spent: 57   },
  { category: "entertainment", budgeted: 80,  spent: 68   },
  { category: "bills",         budgeted: 120, spent: 91   },
  { category: "shopping",      budgeted: 50,  spent: 124  }, // overspent
  { category: "other",         budgeted: 65,  spent: 32   },
];

// ─── Goals ───────────────────────────────────────────────────────────────────

export const mockGoals: Goal[] = [
  {
    id: "g1",
    name: "Emergency Fund",
    emoji: "🏦",
    targetAmount: 1000,
    currentAmount: 420,
    deadline: "2026-12-01",
    color: "blue",
  },
  {
    id: "g2",
    name: "New Laptop",
    emoji: "💻",
    targetAmount: 800,
    currentAmount: 280,
    deadline: "2026-09-01",
    color: "violet",
  },
  {
    id: "g3",
    name: "Summer Trip",
    emoji: "✈️",
    targetAmount: 400,
    currentAmount: 150,
    deadline: "2026-07-01",
    color: "orange",
  },
];

// ─── Monthly trend ────────────────────────────────────────────────────────────

export const mockMonthlyTrend: MonthlyPoint[] = [
  { month: "Oct",  spending: 1050, income: 1480 },
  { month: "Nov",  spending: 1120, income: 1480 },
  { month: "Dec",  spending: 1340, income: 1980 },
  { month: "Jan",  spending: 960,  income: 1480 },
  { month: "Feb",  spending: 1080, income: 1480 },
  { month: "Mar",  spending: 1050, income: 1480 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(n: number) {
  const abs = Math.abs(n);
  return `${n < 0 ? "-" : ""}£${abs.toFixed(2)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
