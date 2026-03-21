"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/ui/Badge";
import { useTransactionStore } from "@/store/useTransactionStore";
import { categoryConfig, formatCurrency, formatDate, type Category } from "@/data/mock";

const TYPE_TABS = [
  { value: "all",     label: "All"     },
  { value: "income",  label: "Income"  },
  { value: "expense", label: "Expenses"},
] as const;

const CATEGORY_FILTERS: Array<{ value: Category | "all"; label: string }> = [
  { value: "all",          label: "All categories" },
  { value: "rent",         label: "Rent"           },
  { value: "food",         label: "Food"           },
  { value: "transport",    label: "Transport"      },
  { value: "entertainment",label: "Entertainment"  },
  { value: "bills",        label: "Bills"          },
  { value: "shopping",     label: "Shopping"       },
  { value: "income",       label: "Income"         },
];

export default function TransactionsPage() {
  const { filters, setFilter, filtered } = useTransactionStore();
  const txns = filtered();

  // Group by date
  const grouped = txns.reduce<Record<string, typeof txns>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">{txns.length} transactions found</p>
      </div>

      <Card className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary/20 transition-colors"
          />
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter({ type: tab.value })}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                filters.type === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter({ category: f.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                filters.category === f.value
                  ? "border-brand-secondary bg-blue-50 text-brand-secondary"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
              style={
                filters.category === f.value && f.value !== "all"
                  ? {
                      borderColor: categoryConfig[f.value as Category]?.color,
                      backgroundColor: categoryConfig[f.value as Category]?.bg,
                      color: categoryConfig[f.value as Category]?.color,
                    }
                  : undefined
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Grouped list */}
      {txns.length === 0 ? (
        <Card className="text-center py-12">
          <SlidersHorizontal size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No transactions match your filters</p>
          <button
            onClick={() => setFilter({ search: "", type: "all", category: "all" })}
            className="mt-3 text-sm text-brand-secondary hover:underline"
          >
            Clear filters
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
                {formatDate(date)}
              </p>
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {grouped[date].map((t) => {
                    const isIncome = t.amount > 0;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-bold"
                          style={{
                            backgroundColor: categoryConfig[t.category].bg,
                            color: categoryConfig[t.category].color,
                          }}
                        >
                          {t.merchant?.slice(0, 1).toUpperCase() ?? "?"}
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <CategoryBadge category={t.category} />
                            {t.merchant && (
                              <span className="text-xs text-slate-400">{t.merchant}</span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div
                          className={`text-sm font-bold flex-shrink-0 ${
                            isIncome ? "text-emerald-600" : "text-slate-800"
                          }`}
                        >
                          {isIncome ? "+" : ""}{formatCurrency(t.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
