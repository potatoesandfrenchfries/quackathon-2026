"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles, MessageSquare, CheckCircle2, TrendingUp,
  ShoppingCart, Globe, CreditCard, Plus, Clock, Eye,
  ChevronUp, ArrowRight,
} from "lucide-react";
import { fetchPosts } from "@/lib/supabase/posts";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Post, Topic } from "@/types/database";

// ─── topic config ──────────────────────────────────────────────────────────────

const TOPICS: { value: Topic | "all"; label: string; emoji: string }[] = [
  { value: "all",       label: "All",        emoji: "🌐" },
  { value: "budgeting", label: "Budgeting",  emoji: "📊" },
  { value: "rent",      label: "Rent",       emoji: "🏠" },
  { value: "loans",     label: "Loans",      emoji: "🎓" },
  { value: "savings",   label: "Savings",    emoji: "💰" },
  { value: "investing", label: "Investing",  emoji: "📈" },
  { value: "overdraft", label: "Overdraft",  emoji: "⚠️" },
  { value: "general",   label: "General",    emoji: "💬" },
];

const TOPIC_COLOR: Record<Topic, string> = {
  budgeting: "#fbbf24",
  loans:     "#a78bfa",
  rent:      "#60a5fa",
  savings:   "#34d399",
  investing: "#f472b6",
  overdraft: "#f87171",
  general:   "#6b7280",
};

const TOPIC_BG: Record<Topic, string> = {
  rent:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  loans:     "bg-purple-500/10 text-purple-400 border-purple-500/20",
  budgeting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  investing: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  overdraft: "bg-red-500/10 text-red-400 border-red-500/20",
  savings:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  general:   "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

// ─── demo posts (shown when API is empty / offline) ───────────────────────────

const DEMO_POSTS: Post[] = [
  {
    id: "demo-1",
    author_id: "demo",
    title: "How much should I realistically budget for groceries each week as a student in London?",
    body: "I just moved to London for uni and I'm completely lost on how much to spend on food. My flatmates seem to spend wildly different amounts. Is £50/week reasonable or am I missing something?",
    topic: "budgeting",
    resolved: true,
    accepted_answer_id: "demo-a1",
    view_count: 312,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "alex_uni", display_name: "Alex" },
    ai_responses: { response_json: {} as any },
  },
  {
    id: "demo-2",
    author_id: "demo",
    title: "Should I pay off my student overdraft or start building a savings fund first?",
    body: "I have a £800 student overdraft that's 0% interest, but I also want to start saving for emergencies. Do I tackle the overdraft first or split contributions?",
    topic: "overdraft",
    resolved: false,
    accepted_answer_id: null,
    view_count: 189,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "fin_curious", display_name: "Priya" },
    ai_responses: null,
  },
  {
    id: "demo-3",
    author_id: "demo",
    title: "Is the Vanguard FTSE All-World ETF a reasonable first investment for a student with £50/month?",
    body: "I've read about index fund investing and keep seeing Vanguard recommended. Is a global ETF suitable for someone just starting with small monthly amounts and a 10-year horizon?",
    topic: "investing",
    resolved: true,
    accepted_answer_id: "demo-a3",
    view_count: 521,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "invest_newbie", display_name: "Jamie" },
    ai_responses: { response_json: {} as any },
  },
  {
    id: "demo-4",
    author_id: "demo",
    title: "My landlord is charging £150 to 'professionally clean' the flat — is this legal?",
    body: "I moved out of a student house last month and now my landlord is trying to deduct £150 from my deposit for professional cleaning even though we left the place spotless. Can they do this?",
    topic: "rent",
    resolved: false,
    accepted_answer_id: null,
    view_count: 98,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "angry_renter", display_name: "Sam" },
    ai_responses: null,
  },
  {
    id: "demo-5",
    author_id: "demo",
    title: "Does using Wise to send money home actually save compared to a UK bank transfer?",
    body: "My family is back in India and I want to send £200 home monthly. My bank charges a flat £15 fee plus a poor exchange rate. Is Wise genuinely cheaper or is the marketing misleading?",
    topic: "general",
    resolved: true,
    accepted_answer_id: "demo-a5",
    view_count: 276,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "global_student", display_name: "Rohan" },
    ai_responses: { response_json: {} as any },
  },
  {
    id: "demo-6",
    author_id: "demo",
    title: "I'm on Plan 2 student loan — at my expected salary, will I ever actually pay it off?",
    body: "I'm graduating next year expecting to earn around £28k. After doing some rough maths it seems like my loan will be written off before I clear it. Is it even worth making overpayments?",
    topic: "loans",
    resolved: false,
    accepted_answer_id: null,
    view_count: 447,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "grad_2025", display_name: "Emma" },
    ai_responses: { response_json: {} as any },
  },
];

// ─── quick question templates ──────────────────────────────────────────────────

const QUICK = [
  { icon: ShoppingCart, color: "#34d399", topic: "budgeting" as Topic,
    title: "Is £3.50 for a loaf of bread fair in the UK?",
    body: "I've been noticing bread prices creeping up. What's a normal price range for a standard 800g loaf at UK supermarkets in 2025?" },
  { icon: Globe,        color: "#60a5fa", topic: "general" as Topic,
    title: "Are Wise / Revolut fees worth it vs my bank?",
    body: "My bank charges a flat fee plus a bad exchange rate. Is switching to Wise or Revolut actually cheaper for regular transfers?" },
  { icon: CreditCard,   color: "#fbbf24", topic: "budgeting" as Topic,
    title: "Is a student railcard worth it if I travel monthly?",
    body: "A railcard costs £30/year. How many journeys do I need to make for it to pay for itself?" },
  { icon: TrendingUp,   color: "#f472b6", topic: "investing" as Topic,
    title: "Is a 10% ISA return realistic for beginners?",
    body: "I've seen claims of 10%+ annual returns. Is this realistic for a passive index-fund ISA, and what should I actually expect?" },
];

// ─── post card ─────────────────────────────────────────────────────────────────

function PostCard({ post, isDemo }: { post: Post; isDemo?: boolean }) {
  const color  = TOPIC_COLOR[post.topic];
  const author = post.profiles?.display_name || post.profiles?.username || "Anonymous";
  // Demo posts pre-fill /ask so clicking actually does something useful
  const href   = isDemo
    ? `/ask?${new URLSearchParams({ title: post.title, body: post.body, topic: post.topic })}`
    : `/feed/${post.id}`;

  return (
    <Link href={href} className="group block">
      <article className="border-b border-gray-800 px-6 py-5 hover:bg-gray-800/30 transition-colors">

        {/* Top meta row — exactly like the Cauldron Labs screenshots */}
        <div className="flex items-center gap-3 mb-3">
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
            TOPIC_BG[post.topic]
          )}>
            {post.topic}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(post.created_at)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Eye className="h-3 w-3" />
            {post.view_count.toLocaleString()}
          </span>
          {post.ai_responses && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-amber-400/80">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          )}
        </div>

        {/* Title — large and bold, Reddit-style */}
        <h2 className="text-lg font-bold text-gray-100 group-hover:text-amber-400 transition-colors leading-snug mb-2">
          {post.title}
        </h2>

        {/* Body excerpt */}
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
          {post.body}
        </p>

        {/* Bottom row: author + status + actions */}
        <div className="flex items-center gap-3">
          {/* Author avatar + name */}
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: `${color}25`, color }}
            >
              {author.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500">{author}</span>
          </div>

          {/* Resolved badge */}
          {post.resolved && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Resolved
            </span>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Upvote button */}
          <button
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-700 text-gray-500 hover:border-amber-400/40 hover:text-amber-400 transition-colors text-xs"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span className="font-mono">{post.view_count > 100 ? Math.floor(post.view_count / 10) : Math.floor(post.view_count / 5)}</span>
          </button>

          {/* Comment count */}
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="font-mono">{post.resolved ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 4)}</span>
          </span>

          {/* View arrow */}
          <div className="flex items-center gap-1 text-xs text-gray-700 group-hover:text-amber-400 transition-colors">
            <span className="hidden sm:inline">Read</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </article>
    </Link>
  );
}

function PostSkeleton() {
  return (
    <div className="border-b border-gray-800 px-6 py-5 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="h-5 w-20 rounded-full bg-gray-800" />
        <div className="h-5 w-24 rounded bg-gray-800" />
      </div>
      <div className="h-6 w-4/5 rounded bg-gray-800" />
      <div className="h-4 w-full rounded bg-gray-800" />
      <div className="h-4 w-3/4 rounded bg-gray-800" />
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTopic, setActiveTopic] = useState<Topic | "all">("all");
  const [apiOnline, setApiOnline]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPosts(activeTopic !== "all" ? activeTopic : undefined)
      .then((data: Post[]) => {
        setPosts(data);
        setApiOnline(true);
      })
      .catch(() => {
        setApiOnline(false);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [activeTopic]);

  // Use demo posts when API is offline or returns nothing
  const displayPosts  = apiOnline && posts.length > 0 ? posts : null;
  const demoPosts     = !apiOnline || posts.length === 0
    ? (activeTopic === "all"
        ? DEMO_POSTS
        : DEMO_POSTS.filter((p) => p.topic === activeTopic))
    : null;
  const showingDemo   = !!demoPosts;

  const totalShown    = displayPosts?.length ?? demoPosts?.length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">

      {/* ── MAIN COLUMN ──────────────────────────────────────────────────── */}
      <div className="space-y-0">

        {/* Page title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Community Forum</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Ask questions, share knowledge, earn credibility
            </p>
          </div>
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-gray-950 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ask
          </Link>
        </div>

        {/* Forum card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">

          {/* Topic filter tabs */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-800 overflow-x-auto scrollbar-none bg-gray-900/90 backdrop-blur sticky top-0 z-10">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveTopic(t.value)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTopic === t.value
                    ? "bg-amber-400 text-gray-950 font-bold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                )}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}

            <div className="ml-auto shrink-0 text-[11px] text-gray-600 font-mono pl-4">
              {!loading && `${totalShown} post${totalShown !== 1 ? "s" : ""}`}
              {showingDemo && <span className="ml-1 text-amber-500/60">(demo)</span>}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div>{[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}</div>
          )}

          {/* Posts */}
          {!loading && displayPosts && displayPosts.length > 0 && (
            <div>
              {displayPosts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}

          {/* Demo posts */}
          {!loading && demoPosts && demoPosts.length > 0 && (
            <div>
              {demoPosts.map((p) => <PostCard key={p.id} post={p} isDemo />)}
            </div>
          )}

          {/* True empty (demo also empty for that topic) */}
          {!loading && totalShown === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto">
                <MessageSquare className="h-7 w-7 text-gray-600" />
              </div>
              <div>
                <p className="text-gray-300 font-semibold">No questions yet in {activeTopic}</p>
                <p className="text-gray-600 text-sm mt-1">Be the first to ask!</p>
              </div>
              <Link
                href={`/ask?topic=${activeTopic}`}
                className="inline-block px-6 py-2.5 bg-amber-400 text-gray-950 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors"
              >
                Ask the first question
              </Link>
            </div>
          )}

          {/* Footer */}
          {!loading && totalShown > 0 && (
            <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between bg-gray-900/50">
              <p className="text-xs text-gray-600">
                {totalShown} question{totalShown !== 1 ? "s" : ""} shown
              </p>
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400 text-gray-950 font-bold text-xs rounded-lg hover:bg-amber-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ask a question
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Stats */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Forum Stats</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Questions",   value: showingDemo ? DEMO_POSTS.length : posts.length,                          color: "#fbbf24" },
              { label: "Resolved",    value: showingDemo ? DEMO_POSTS.filter(p=>p.resolved).length : posts.filter(p=>p.resolved).length, color: "#34d399" },
              { label: "Open",        value: showingDemo ? DEMO_POSTS.filter(p=>!p.resolved).length : posts.filter(p=>!p.resolved).length, color: "#60a5fa" },
              { label: "AI-Answered", value: showingDemo ? DEMO_POSTS.filter(p=>p.ai_responses).length : posts.filter(p=>p.ai_responses).length, color: "#a78bfa" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-800 px-3 py-2.5">
                <p className="text-[10px] text-gray-500">{s.label}</p>
                <p className="text-xl font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI insights pill */}
        <div
          className="rounded-2xl p-4 space-y-2 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#1c1800,#261f00,#1a1428)", border: "1px solid rgba(251,191,36,0.15)" }}
        >
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full opacity-10 blur-3xl" style={{ background: "#fbbf24" }} />
          <div className="flex items-center gap-2 relative">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-bold text-amber-400">AI Advisor active</p>
          </div>
          <p className="text-[11px] text-gray-400 relative leading-relaxed">
            Every question gets a Buddy AI response, weighted by community credibility scores.
          </p>
        </div>

        {/* How this works — differentiator explainer */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">How Buddy differs from Reddit</p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-amber-400">1</span>
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-medium">Topic-scoped credibility.</span>{" "}
                800 pts in Budgeting ≠ 800 pts in Investing. Domain expertise shown on every answer.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-amber-400">2</span>
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-medium">Weighted votes.</span>{" "}
                An oracle&apos;s upvote counts 5× a newcomer&apos;s. Expert consensus matters more than popularity.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-black text-amber-400">3</span>
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-gray-200 font-medium">AI cites its sources.</span>{" "}
                Buddy reads every answer ranked by credibility and tells you which voice it weighted most — and why.
              </p>
            </li>
          </ul>
        </div>

        {/* Quick question templates */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-bold text-gray-300">Common Questions</p>
            <span className="ml-auto text-[9px] font-mono text-gray-600">tap to ask →</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {QUICK.map((q, i) => {
              const Icon = q.icon;
              const params = new URLSearchParams({ title: q.title, body: q.body, topic: q.topic });
              return (
                <Link
                  key={i}
                  href={`/ask?${params}`}
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: q.color }} />
                  <p className="text-[12px] text-gray-400 group-hover:text-gray-200 transition-colors leading-relaxed line-clamp-2">
                    {q.title}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-gray-800">
            <Link
              href="/check"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-800 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Try AI Financial Checks
            </Link>
          </div>
        </div>

        {/* Topic quick-filters */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Browse by Topic</p>
          {TOPICS.filter(t => t.value !== "all").map((t) => {
            const topicPosts = showingDemo
              ? DEMO_POSTS.filter(p => p.topic === t.value)
              : posts.filter(p => p.topic === t.value);
            return (
              <button
                key={t.value}
                onClick={() => setActiveTopic(t.value)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left",
                  activeTopic === t.value
                    ? "bg-amber-400/10 text-amber-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                )}
              >
                <span className="text-base leading-none">{t.emoji}</span>
                <span className="flex-1 font-medium text-xs">{t.label}</span>
                <span className="text-[11px] font-mono text-gray-600">{topicPosts.length}</span>
                <div
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: TOPIC_COLOR[t.value as Topic] }}
                />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
