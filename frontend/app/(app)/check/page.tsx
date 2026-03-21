"use client";

import { useState } from "react";
import {
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── types ─────────────────────────────────────────────────────────────────

type ToolId = "grocery" | "purchase" | "investment";

interface GroceryResult {
  verdict: "good_deal" | "fair" | "overpriced";
  headline: string;
  typical_range: string;
  tip: string;
  confidence: number;
  disclaimer: string;
}

interface PurchaseResult {
  verdict: "worth_it" | "borderline" | "not_worth_it";
  headline: string;
  long_term_cost: string;
  alternatives: string;
  tip: string;
  confidence: number;
  disclaimer: string;
}

interface InvestmentResult {
  verdict: "realistic" | "optimistic" | "unrealistic";
  headline: string;
  typical_return: string;
  risk_level: "low" | "medium" | "high" | "very_high";
  suitability: string;
  tip: string;
  confidence: number;
  disclaimer: string;
}

// ─── config ────────────────────────────────────────────────────────────────

const TOOLS: { id: ToolId; label: string; tagline: string; icon: React.ElementType; color: string }[] = [
  {
    id: "grocery",
    label: "Grocery Checker",
    tagline: "Is this price a good deal?",
    icon: ShoppingCart,
    color: "#34d399",
  },
  {
    id: "purchase",
    label: "Purchase Analyser",
    tagline: "Is it worth it long-term?",
    icon: CreditCard,
    color: "#fbbf24",
  },
  {
    id: "investment",
    label: "Investment Sense",
    tagline: "Is this return realistic?",
    icon: TrendingUp,
    color: "#a78bfa",
  },
];

const VERDICT_CONFIG = {
  // grocery
  good_deal:     { label: "Good Deal",     icon: CheckCircle2, color: "#34d399", bg: "bg-emerald-400/10 border-emerald-400/30" },
  fair:          { label: "Fair Price",    icon: Minus,        color: "#fbbf24", bg: "bg-amber-400/10 border-amber-400/30" },
  overpriced:    { label: "Overpriced",    icon: XCircle,      color: "#f87171", bg: "bg-red-400/10 border-red-400/30" },
  // purchase
  worth_it:      { label: "Worth It",      icon: CheckCircle2, color: "#34d399", bg: "bg-emerald-400/10 border-emerald-400/30" },
  borderline:    { label: "Borderline",    icon: Minus,        color: "#fbbf24", bg: "bg-amber-400/10 border-amber-400/30" },
  not_worth_it:  { label: "Not Worth It",  icon: XCircle,      color: "#f87171", bg: "bg-red-400/10 border-red-400/30" },
  // investment
  realistic:     { label: "Realistic",     icon: CheckCircle2, color: "#34d399", bg: "bg-emerald-400/10 border-emerald-400/30" },
  optimistic:    { label: "Optimistic",    icon: Minus,        color: "#fbbf24", bg: "bg-amber-400/10 border-amber-400/30" },
  unrealistic:   { label: "Unrealistic",   icon: XCircle,      color: "#f87171", bg: "bg-red-400/10 border-red-400/30" },
};

const RISK_COLORS: Record<string, string> = {
  low: "#34d399",
  medium: "#fbbf24",
  high: "#fb923c",
  very_high: "#f87171",
};

// ─── form components ────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-100 text-sm placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors";

// ─── result panels ─────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: string }) {
  const cfg = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-sm", cfg.bg)}
      style={{ color: cfg.color }}>
      <Icon className="h-4 w-4" />
      {cfg.label}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "#34d399" : value >= 45 ? "#fbbf24" : "#f87171";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">AI confidence</span>
        <span className="font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-800">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className="text-sm text-gray-300 leading-relaxed">{value}</p>
    </div>
  );
}

function GroceryResult({ result }: { result: GroceryResult }) {
  return (
    <ResultCard headline={result.headline} verdict={result.verdict} confidence={result.confidence} disclaimer={result.disclaimer}>
      <ResultRow label="Typical UK range" value={result.typical_range} />
      <ResultRow label="Money-saving tip" value={result.tip} />
    </ResultCard>
  );
}

function PurchaseResult({ result }: { result: PurchaseResult }) {
  return (
    <ResultCard headline={result.headline} verdict={result.verdict} confidence={result.confidence} disclaimer={result.disclaimer}>
      <ResultRow label="Long-term cost analysis" value={result.long_term_cost} />
      <ResultRow label="Alternatives" value={result.alternatives} />
      <ResultRow label="Recommendation" value={result.tip} />
    </ResultCard>
  );
}

function InvestmentResult({ result }: { result: InvestmentResult }) {
  const riskColor = RISK_COLORS[result.risk_level] ?? "#6b7280";
  return (
    <ResultCard headline={result.headline} verdict={result.verdict} confidence={result.confidence} disclaimer={result.disclaimer}>
      <ResultRow label="Typical returns" value={result.typical_return} />
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Risk level</p>
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}30` }}>
          {result.risk_level.replace("_", " ").toUpperCase()}
        </span>
      </div>
      <ResultRow label="Student suitability" value={result.suitability} />
      <ResultRow label="Recommendation" value={result.tip} />
    </ResultCard>
  );
}

function ResultCard({
  headline,
  verdict,
  confidence,
  disclaimer,
  children,
}: {
  headline: string;
  verdict: string;
  confidence: number;
  disclaimer: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-5 space-y-4 animate-fade-in">
      <div className="space-y-3">
        <VerdictBadge verdict={verdict} />
        <p className="text-lg font-bold text-white leading-snug">{headline}</p>
      </div>
      <div className="space-y-3 divide-y divide-gray-700/60">
        <div className="space-y-3">{children}</div>
      </div>
      <ConfidenceBar value={confidence} />
      <div className="flex items-start gap-2 text-xs text-gray-600 pt-1">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>{disclaimer}</p>
      </div>
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────

export default function CheckPage() {
  const [active, setActive] = useState<ToolId>("grocery");
  const [groceryResult, setGroceryResult] = useState<GroceryResult | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [investmentResult, setInvestmentResult] = useState<InvestmentResult | null>(null);

  const activeTool = TOOLS.find((t) => t.id === active)!;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">AI Tools</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-100">Financial Checks</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Instant AI-powered analysis for everyday financial decisions.
        </p>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 flex-wrap">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                isActive
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200 bg-gray-900"
              )}
            >
              <Icon className="h-4 w-4" style={isActive ? { color: activeTool.color } : {}} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tool panel */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        {/* Panel header */}
        <div
          className="px-5 py-4 border-b border-gray-800 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${activeTool.color}08 0%, transparent 60%)` }}
        >
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${activeTool.color}15`, border: `1px solid ${activeTool.color}30` }}
          >
            <activeTool.icon className="h-4.5 w-4.5" style={{ color: activeTool.color }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{activeTool.label}</p>
            <p className="text-xs text-gray-500">{activeTool.tagline}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-gray-500">Powered by Claude</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Form */}
          <div>
            {active === "grocery" && (
              <GroceryFormWrapper onResult={setGroceryResult} />
            )}
            {active === "purchase" && (
              <PurchaseFormWrapper onResult={setPurchaseResult} />
            )}
            {active === "investment" && (
              <InvestmentFormWrapper onResult={setInvestmentResult} />
            )}
          </div>

          {/* Result */}
          <div>
            {active === "grocery" && groceryResult && (
              <GroceryResult result={groceryResult} />
            )}
            {active === "purchase" && purchaseResult && (
              <PurchaseResult result={purchaseResult} />
            )}
            {active === "investment" && investmentResult && (
              <InvestmentResult result={investmentResult} />
            )}
            {((active === "grocery" && !groceryResult) ||
              (active === "purchase" && !purchaseResult) ||
              (active === "investment" && !investmentResult)) && (
              <div className="h-full min-h-[200px] rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 text-center p-6">
                <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Result will appear here</p>
                  <p className="text-xs text-gray-700 mt-0.5">Fill in the form and submit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper components to handle form submission properly
function GroceryFormWrapper({ onResult }: { onResult: (r: GroceryResult) => void }) {
  const [f, setF] = useState({ item: "", price: "", unit: "", context: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.item || !f.price) return;
    setLoading(true);
    try {
      const r = await api.tools.check("grocery", f);
      onResult(r as unknown as GroceryResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Item name">
        <input className={inputCls} placeholder="e.g. Whole milk 2L" value={f.item} onChange={set("item")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (£)">
          <input className={inputCls} type="number" step="0.01" placeholder="1.89" value={f.price} onChange={set("price")} />
        </Field>
        <Field label="Unit (optional)">
          <input className={inputCls} placeholder="kg / litre / pack" value={f.unit} onChange={set("unit")} />
        </Field>
      </div>
      <Field label="Where bought (optional)">
        <input className={inputCls} placeholder="e.g. Tesco, Lidl, market" value={f.context} onChange={set("context")} />
      </Field>
      <button
        type="submit"
        disabled={!f.item || !f.price || loading}
        className="w-full py-2.5 bg-amber-400 text-gray-950 font-semibold rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? <><Sparkles className="h-4 w-4 animate-pulse" />Asking Buddy…</> : "Check price"}
      </button>
    </form>
  );
}

function PurchaseFormWrapper({ onResult }: { onResult: (r: PurchaseResult) => void }) {
  const [f, setF] = useState({ item: "", price: "", context: "", timeframe: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.item || !f.price) return;
    setLoading(true);
    try {
      const r = await api.tools.check("purchase", f);
      onResult(r as unknown as PurchaseResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="What are you buying?">
        <input
          className={inputCls}
          placeholder="e.g. MacBook Air M2, gym membership"
          value={f.item}
          onChange={(e) => setF((p) => ({ ...p, item: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (£)">
          <input
            className={inputCls}
            type="number"
            placeholder="1200"
            value={f.price}
            onChange={(e) => setF((p) => ({ ...p, price: e.target.value }))}
          />
        </Field>
        <Field label="How long will you use it?">
          <select
            className={inputCls}
            value={f.timeframe}
            onChange={(e) => setF((p) => ({ ...p, timeframe: e.target.value }))}
          >
            <option value="">Select…</option>
            <option value="less than 1 year">Less than 1 year</option>
            <option value="1-2 years">1–2 years</option>
            <option value="3-5 years">3–5 years</option>
            <option value="5+ years">5+ years</option>
          </select>
        </Field>
      </div>
      <Field label="Context / why you need it">
        <textarea
          className={cn(inputCls, "resize-none")}
          rows={3}
          placeholder="e.g. For university coursework, coding, and portability…"
          value={f.context}
          onChange={(e) => setF((p) => ({ ...p, context: e.target.value }))}
        />
      </Field>
      <button
        type="submit"
        disabled={!f.item || !f.price || loading}
        className="w-full py-2.5 bg-amber-400 text-gray-950 font-semibold rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? <><Sparkles className="h-4 w-4 animate-pulse" />Asking Buddy…</> : "Analyse purchase"}
      </button>
    </form>
  );
}

function InvestmentFormWrapper({ onResult }: { onResult: (r: InvestmentResult) => void }) {
  const [f, setF] = useState({ investment_type: "", expected_return: "", amount: "", duration: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.investment_type || !f.expected_return) return;
    setLoading(true);
    try {
      const r = await api.tools.check("investment", f);
      onResult(r as unknown as InvestmentResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Investment type">
        <select
          className={inputCls}
          value={f.investment_type}
          onChange={(e) => setF((p) => ({ ...p, investment_type: e.target.value }))}
        >
          <option value="">Select…</option>
          <option value="Stocks & Shares ISA (index fund)">Stocks & Shares ISA (index fund)</option>
          <option value="Individual stocks">Individual stocks</option>
          <option value="Cryptocurrency">Cryptocurrency</option>
          <option value="Lifetime ISA (LISA)">Lifetime ISA (LISA)</option>
          <option value="Cash savings account">Cash savings account</option>
          <option value="Property">Property</option>
          <option value="Peer-to-peer lending">Peer-to-peer lending</option>
          <option value="Other">Other</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected annual return (%)">
          <input
            className={inputCls}
            type="number"
            placeholder="12"
            value={f.expected_return}
            onChange={(e) => setF((p) => ({ ...p, expected_return: e.target.value }))}
          />
        </Field>
        <Field label="Amount to invest (£)">
          <input
            className={inputCls}
            type="number"
            placeholder="500"
            value={f.amount}
            onChange={(e) => setF((p) => ({ ...p, amount: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="Time horizon (years)">
        <select
          className={inputCls}
          value={f.duration}
          onChange={(e) => setF((p) => ({ ...p, duration: e.target.value }))}
        >
          <option value="">Select…</option>
          <option value="1">1 year</option>
          <option value="2">2 years</option>
          <option value="5">5 years</option>
          <option value="10">10 years</option>
          <option value="20">20+ years</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={!f.investment_type || !f.expected_return || loading}
        className="w-full py-2.5 bg-amber-400 text-gray-950 font-semibold rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? <><Sparkles className="h-4 w-4 animate-pulse" />Asking Buddy…</> : "Check investment"}
      </button>
    </form>
  );
}
