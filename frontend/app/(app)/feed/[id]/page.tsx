"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Coins,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  fetchForumPost,
  createAnswer,
  toForumPostDetailData,
  type ForumPostDetailData,
} from "@/lib/supabase/posts";
import { CredibilityBadge, tierFromScore } from "@/components/CredibilityBadge";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnswerEnriched, AIResponse, Topic } from "@/types/database";

const TOPIC_COLORS: Record<Topic, string> = {
  rent:      "bg-blue-400/10 text-blue-400 border-blue-400/30",
  loans:     "bg-purple-400/10 text-purple-400 border-purple-400/30",
  budgeting: "bg-green-400/10 text-green-400 border-green-400/30",
  investing: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  overdraft: "bg-red-400/10 text-red-400 border-red-400/30",
  savings:   "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  general:   "bg-gray-400/10 text-gray-400 border-gray-400/30",
};

// ─── Demo data ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEMO_POSTS_DATA: Record<string, any> = {
  "demo-1": {
    id: "demo-1", author_id: "demo",
    title: "How much should I realistically budget for groceries each week as a student in London?",
    body: "I just moved to London for uni and I'm completely lost on how much to spend on food. My flatmates seem to spend wildly different amounts. Is £50/week reasonable or am I missing something?",
    topic: "budgeting", resolved: true, accepted_answer_id: "demo-a1",
    view_count: 312, created_at: new Date(Date.now() - 1000*60*60*3).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "alex_uni", display_name: "Alex" },
    ai_responses: null,
    answers_enriched: [
      { id: "demo-a1", post_id: "demo-1", author_id: "u1", content: "£50/week is on the lower-middle end for London but totally achievable. The key is where you shop. Aldi/Lidl in Zones 2–3 will get you a full week's food for £35–45 if you meal-plan. Avoid Waitrose and M&S for daily shopping — they're 40–60% more expensive for the same items. Batch-cook on Sundays (pasta sauces, curries, stews) and freeze portions. Your biggest enemy is food waste, not food cost.", stake_amount: 150, fact_check_status: "accurate", author_username: "finance_oracle", author_display_name: "Dr. Sarah M.", author_total_cred: 1240, author_topic_cred: 890, vote_total: 24, vote_count: 24, created_at: new Date(Date.now() - 1000*60*60*2).toISOString() },
      { id: "demo-a2", post_id: "demo-1", author_id: "u2", content: "I manage on £40/week consistently by doing a big Lidl shop on Mondays and using the Too Good To Go app for discounted food from local cafes. Also check out the reduced section at Tesco/Sainsbury's around 7–9pm — half-price fresh produce. Oats, eggs, lentils and frozen veg are your best friends for cheap nutrition.", stake_amount: 75, fact_check_status: "accurate", author_username: "savvy_student", author_display_name: "Priya K.", author_total_cred: 620, author_topic_cred: 580, vote_total: 18, vote_count: 18, created_at: new Date(Date.now() - 1000*60*60*1).toISOString() },
      { id: "demo-a3", post_id: "demo-1", author_id: "u3", content: "Honestly I spend about £80 but I buy branded stuff and eat out sometimes. I think it depends on your lifestyle. Some people budget £30, some spend £100+. There's no single right answer.", stake_amount: 0, fact_check_status: "pending", author_username: "newbie_nina", author_display_name: "Nina", author_total_cred: 95, author_topic_cred: 45, vote_total: 3, vote_count: 3, created_at: new Date(Date.now() - 1000*60*30).toISOString() },
    ],
  },
  "demo-2": {
    id: "demo-2", author_id: "demo",
    title: "Should I pay off my student overdraft or start building a savings fund first?",
    body: "I have a £800 student overdraft that's 0% interest, but I also want to start saving for emergencies. Do I tackle the overdraft first or split contributions?",
    topic: "overdraft", resolved: false, accepted_answer_id: null,
    view_count: 189, created_at: new Date(Date.now() - 1000*60*60*8).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "fin_curious", display_name: "Priya" },
    ai_responses: null,
    answers_enriched: [
      { id: "demo-b1", post_id: "demo-2", author_id: "u4", content: "The math is clear: since the overdraft is 0% interest, there's no financial cost to keeping it. Build your emergency fund first — aim for £500–£1,000 before tackling the overdraft. The reason? Without savings, any unexpected expense (broken laptop, train home) will push you straight back into the overdraft anyway. Once you have a buffer, then clear the overdraft. Your bank will likely convert it to a fee-charging overdraft after graduation, so have a plan to clear it by then.", stake_amount: 200, fact_check_status: "accurate", author_username: "debt_advisor", author_display_name: "James R.", author_total_cred: 980, author_topic_cred: 760, vote_total: 31, vote_count: 31, created_at: new Date(Date.now() - 1000*60*60*6).toISOString() },
      { id: "demo-b2", post_id: "demo-2", author_id: "u5", content: "Split 50/50. The psychological benefit of seeing both numbers improve matters — if you only do one, it feels like you're not making progress on the other. £50/month split as £25 to savings, £25 to overdraft clearance means you're debt-free in ~32 months while also building a £800 emergency fund. Win-win.", stake_amount: 100, fact_check_status: "pending", author_username: "frugal_frank", author_display_name: "Frank", author_total_cred: 450, author_topic_cred: 380, vote_total: 12, vote_count: 12, created_at: new Date(Date.now() - 1000*60*60*4).toISOString() },
    ],
  },
  "demo-3": {
    id: "demo-3", author_id: "demo",
    title: "Is the Vanguard FTSE All-World ETF a reasonable first investment for a student with £50/month?",
    body: "I've read about index fund investing and keep seeing Vanguard recommended. Is a global ETF suitable for someone just starting with small monthly amounts and a 10-year horizon?",
    topic: "investing", resolved: true, accepted_answer_id: "demo-c1",
    view_count: 521, created_at: new Date(Date.now() - 1000*60*60*24).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "invest_newbie", display_name: "Jamie" },
    ai_responses: null,
    answers_enriched: [
      { id: "demo-c1", post_id: "demo-3", author_id: "u6", content: "Vanguard FTSE All-World (VWRL/VWRP) is genuinely one of the best choices for a beginner with a long horizon. 0.22% OCF, exposure to 3,600+ companies across 50+ countries, and Vanguard's track record of keeping costs low. On a 10-year horizon with £50/month, compound growth at a conservative 7% gives you roughly £8,600 — compared to ~£6,000 in cash. Use a Stocks & Shares ISA to shelter all gains from tax. Platform choice matters: Vanguard's own platform is cheapest under £50k assets.", stake_amount: 300, fact_check_status: "accurate", author_username: "invest_guru", author_display_name: "Marcus T.", author_total_cred: 1150, author_topic_cred: 920, vote_total: 45, vote_count: 45, created_at: new Date(Date.now() - 1000*60*60*20).toISOString() },
      { id: "demo-c2", post_id: "demo-3", author_id: "u7", content: "Yes, excellent choice. One thing to add: consider VWRP (accumulating) over VWRL (distributing) since dividends are automatically reinvested, which compounds better and avoids the admin of reinvesting manually. At £50/month the platform fee matters more than the fund — Vanguard charges 0.15% capped at £375/year, making it the cheapest until you hit £250k.", stake_amount: 100, fact_check_status: "accurate", author_username: "moderate_mike", author_display_name: "Mike", author_total_cred: 580, author_topic_cred: 490, vote_total: 22, vote_count: 22, created_at: new Date(Date.now() - 1000*60*60*18).toISOString() },
    ],
  },
  "demo-5": {
    id: "demo-5", author_id: "demo",
    title: "Does using Wise to send money home actually save compared to a UK bank transfer?",
    body: "My family is back in India and I want to send £200 home monthly. My bank charges a flat £15 fee plus a poor exchange rate. Is Wise genuinely cheaper or is the marketing misleading?",
    topic: "general", resolved: true, accepted_answer_id: "demo-e1",
    view_count: 276, created_at: new Date(Date.now() - 1000*60*60*36).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "global_student", display_name: "Rohan" },
    ai_responses: null,
    answers_enriched: [
      { id: "demo-e1", post_id: "demo-5", author_id: "u10", content: "Wise is genuinely cheaper — not marketing. On £200 to India, a typical UK high-street bank charges £15 fee + ~2.5% exchange rate margin = roughly £20 total cost. Wise charges ~0.6% fee + mid-market exchange rate = roughly £1.20 total. That's a saving of ~£18 per transfer, or £216/year on monthly transfers. The exchange rate is the invisible cost most people miss — Wise uses the real mid-market rate (the one you see on Google), while banks add 2–4% on top. Revolut is similarly priced and also worth considering.", stake_amount: 175, fact_check_status: "accurate", author_username: "money_maven", author_display_name: "Aisha", author_total_cred: 1020, author_topic_cred: 850, vote_total: 29, vote_count: 29, created_at: new Date(Date.now() - 1000*60*60*30).toISOString() },
      { id: "demo-e2", post_id: "demo-5", author_id: "u11", content: "Both Wise and Revolut are solid. One tip: Revolut gives you a free plan with fee-free transfers up to a limit each month. If you're sending £200/month, the free tier usually covers it. Just avoid sending on weekends with Revolut as they add a small markup — weekday transfers use the live rate.", stake_amount: 50, fact_check_status: "accurate", author_username: "tech_fin", author_display_name: "Dev", author_total_cred: 430, author_topic_cred: 380, vote_total: 14, vote_count: 14, created_at: new Date(Date.now() - 1000*60*60*24).toISOString() },
    ],
  },
  "demo-6": {
    id: "demo-6", author_id: "demo",
    title: "I'm on Plan 2 student loan — at my expected salary, will I ever actually pay it off?",
    body: "I'm graduating next year expecting to earn around £28k. After doing some rough maths it seems like my loan will be written off before I clear it. Is it even worth making overpayments?",
    topic: "loans", resolved: false, accepted_answer_id: null,
    view_count: 447, created_at: new Date(Date.now() - 1000*60*60*48).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: { username: "grad_2025", display_name: "Emma" },
    ai_responses: null,
    answers_enriched: [
      { id: "demo-f1", post_id: "demo-6", author_id: "u12", content: "At £28k starting salary, you're almost certainly in the 'treat it as a graduate tax' camp. Plan 2 repayments are 9% of earnings above the £27,295 threshold — so at £28k you'd pay about £64/year initially. With typical £40–60k loan balances, you'll never clear it before the 30-year write-off. The IFS estimates ~75% of Plan 2 borrowers won't fully repay. Voluntary overpayments are almost always a bad idea in this scenario — that money compounds better in an ISA or pension.", stake_amount: 220, fact_check_status: "accurate", author_username: "loan_expert", author_display_name: "Prof. David", author_total_cred: 1180, author_topic_cred: 940, vote_total: 52, vote_count: 52, created_at: new Date(Date.now() - 1000*60*60*40).toISOString() },
      { id: "demo-f2", post_id: "demo-6", author_id: "u13", content: "The only exception where overpayments could make sense: if you expect to earn well above £50k within a few years and have a smaller loan. But at £28k starting salary with a typical loan, don't overpay. Think of it as a 9% income tax for higher earners — nothing more. Focus on building savings and pension contributions instead.", stake_amount: 100, fact_check_status: "accurate", author_username: "grad_advisor", author_display_name: "Rachel", author_total_cred: 750, author_topic_cred: 620, vote_total: 21, vote_count: 21, created_at: new Date(Date.now() - 1000*60*60*36).toISOString() },
    ],
  },
};

const DEMO_AI: Record<string, AIResponse> = {
  "demo-1": { summary: "Community consensus from high-credibility contributors (Dr. Sarah M. with 890 budgeting pts, Priya K. with 580 pts) is that £50/week is achievable but requires intentional shopping. Aldi/Lidl are consistently recommended as 40–50% cheaper than major supermarkets for equivalent quality. Meal planning and batch cooking are cited as the highest-impact habits.", action: "Switch primary grocery shopping to Aldi or Lidl, meal-plan 5 days ahead, and use Too Good To Go for supplemental discounted food.", confidence: 88, top_source_username: "finance_oracle", top_source_cred: 1240, reasoning: "Dr. Sarah M. holds 890 topic-specific credibility in budgeting and staked 150pts — the highest combined signal. Her advice aligns with current UK supermarket price data.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["moneysavingexpert.com/shopping/cheap-supermarkets", "toogoodtogo.com"] },
  "demo-2": { summary: "The highest-credibility voice (James R., 760 overdraft pts, 200pts staked) makes a strong mathematical case for emergency savings first: 0% overdraft has no cost, but lacking savings creates a cycle that pushes you back into it. The split-contribution approach has psychological merit but is mathematically suboptimal.", action: "Build a £500–£1,000 emergency fund before clearing the overdraft. Once that buffer exists, direct spare income toward clearing the overdraft before graduation when it typically becomes interest-bearing.", confidence: 79, top_source_username: "debt_advisor", top_source_cred: 980, reasoning: "James R. holds 760 topic-specific credibility and staked 200pts — the highest wager on this thread, showing strong conviction backed by expertise.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["moneyhelper.org.uk/en/everyday-money/budgeting"] },
  "demo-3": { summary: "Strong expert consensus (Marcus T., 920 investing pts, 300pts staked; Mike, 490 pts) confirms Vanguard FTSE All-World is an excellent first investment for a long-horizon, small-amount investor. Key nuance: VWRP (accumulating) is preferred over VWRL for tax efficiency and compounding. Platform choice is critical at small amounts — Vanguard's own platform is cheapest under £50k.", action: "Open a Stocks & Shares ISA directly on Vanguard's platform and set up a monthly direct debit into VWRP (accumulating). Don't pause contributions if markets dip — time in market beats timing the market.", confidence: 93, top_source_username: "invest_guru", top_source_cred: 1150, reasoning: "Marcus T. holds 920 investing topic credibility with the highest stake (300pts) — his analysis includes specific fund mechanics and compound growth calculations, verified against current Vanguard OCF data.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["vanguardinvestor.co.uk", "monevator.com/stocks-and-shares-isa"] },
  "demo-4": { summary: "Both high-credibility contributors (Laura H., 720 rent pts, 250pts staked; Tom, 580 pts) agree: this claim is likely disputable. Under the Tenant Fees Act 2019, professional cleaning charges require prior evidence in the check-in inventory. The free dispute process through deposit protection schemes has a strong track record for tenants in these cases.", action: "Raise a formal dispute with your deposit protection scheme (TDS, DPS, or MyDeposits) immediately. Gather timestamped photo evidence and request the landlord's proof that professional cleaning was specified in your original inventory.", confidence: 84, top_source_username: "legal_laura", top_source_cred: 890, reasoning: "Laura H. holds 720 rent-specific credibility and staked the highest amount (250pts), citing specific UK legislation (Tenant Fees Act 2019) — the most concrete legal grounding in the thread.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["gov.uk/deposit-protection-schemes-and-landlords", "citizensadvice.org.uk/housing/renting-privately"] },
  "demo-5": { summary: "High-credibility analysis (Aisha, 850 general pts, 175pts staked) confirms Wise is genuinely cheaper — the key insight is that exchange rate margins (invisible to most) typically cost 2–3x more than the headline fee. On £200/month to India, Wise saves approximately £18 per transfer vs. a high-street bank.", action: "Use Wise for your monthly £200 transfer. Sign up, verify your account (takes 1–2 days), and set up a repeating payment. For comparison, check Revolut's free plan limits — if under the monthly cap, it's equally competitive.", confidence: 91, top_source_username: "money_maven", top_source_cred: 1020, reasoning: "Aisha has 850 topic credibility and staked 175pts with specific cost calculations validated against current Wise and bank fee structures.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["wise.com/gb", "moneysavingexpert.com/banking/cheap-international-money-transfers"] },
  "demo-6": { summary: "Expert consensus is clear (Prof. David, 940 loans pts, 220pts staked; Rachel, 620 pts): at £28k starting salary, the vast majority of Plan 2 borrowers will not clear their loan before the 30-year write-off. The IFS data supports this — ~75% of Plan 2 borrowers won't fully repay. Voluntary overpayments are statistically a poor financial decision at this income level.", action: "Do not make voluntary overpayments on your Plan 2 loan. Treat it as a graduate income tax contribution. Redirect any surplus into a pension (employer-matched if possible) and a Cash or Stocks & Shares ISA instead.", confidence: 90, top_source_username: "loan_expert", top_source_cred: 1180, reasoning: "Prof. David holds 940 loans-specific credibility — the highest in this thread — and staked 220pts, citing IFS research and specific repayment calculations at the given salary.", disclaimer: "This is educational guidance only, not regulated financial advice.", resources: ["gov.uk/repaying-your-student-loan", "moneysavingexpert.com/students/student-loans-decoded"] },
};

// ─── AI Consensus Card ────────────────────────────────────────────────────────

function AIConsensusCard({ ai, comments }: { ai: AIResponse; comments: AnswerEnriched[] }) {
  const topVoices = comments
    .filter((c) => c.author_total_cred > 0)
    .sort((a, b) => b.author_total_cred - a.author_total_cred)
    .slice(0, 3);

  const confPct = Math.round(ai.confidence * (ai.confidence <= 1 ? 100 : 1));

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
              Buddy&apos;s Consensus Read
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Credibility-weighted synthesis · {comments.length} opinion{comments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs text-amber-400 font-bold">{confPct}%</p>
          <div className="w-20 h-1 rounded-full bg-gray-800 mt-1">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${confPct}%` }} />
          </div>
        </div>
      </div>

      {/* Top voices */}
      {topVoices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-600">
            Voices that shaped this
          </p>
          <div className="flex flex-wrap gap-2">
            {topVoices.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700"
              >
                <div className="h-5 w-5 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0">
                  {(c.author_display_name || c.author_username).charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-300">
                  {c.author_display_name || `@${c.author_username}`}
                </span>
                <span className="text-[10px] text-amber-400/70 font-mono">{c.author_total_cred} pts</span>
                {(c as any).stake_amount > 0 && (
                  <span className="text-[9px] text-amber-500/50 font-mono">
                    · {(c as any).stake_amount} wagered
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-gray-100 leading-relaxed text-sm">{ai.summary}</p>

      <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/70 mb-1">
          Recommended Action
        </p>
        <p className="text-amber-300 font-semibold text-sm">{ai.action}</p>
      </div>

      {ai.resources && ai.resources.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-600">Resources</p>
          {ai.resources.map((r, i) => (
            <p key={i} className="text-xs text-amber-400/70">→ {r}</p>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-600 italic border-t border-gray-800/60 pt-3">
        {ai.disclaimer}
      </p>
    </div>
  );
}

function AIConsensusLoading() {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
            Buddy&apos;s Consensus Read
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Synthesising opinions by credibility weight…
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({
  comment,
  isAccepted,
  postTopic,
}: {
  comment: AnswerEnriched;
  isAccepted: boolean;
  postTopic: Topic;
}) {
  const tier = tierFromScore(comment.author_total_cred);
  const displayName = comment.author_display_name || comment.author_username;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 space-y-3 transition-colors",
        isAccepted
          ? "border-green-400/30 bg-green-400/5"
          : "border-gray-800 bg-gray-900"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAccepted && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
              <span className="font-medium text-gray-200 text-sm">{displayName}</span>
              <CredibilityBadge score={comment.author_total_cred} tier={tier} size="sm" showLabel />
            </div>
            {comment.author_topic_cred > 0 && (
              <p className="text-[10px] text-amber-400/60 mt-0.5">
                {comment.author_topic_cred} pts in {postTopic}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(comment as any).stake_amount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <Coins className="h-3 w-3" />
              {(comment as any).stake_amount} wagered
            </span>
          )}
          <span className="text-xs text-gray-600">{formatRelativeTime(comment.created_at)}</span>
        </div>
      </div>

      <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{comment.content}</p>

      {comment.fact_check_status !== "pending" && (
        <div className="pt-1">
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
              comment.fact_check_status === "accurate"
                ? "text-green-400 bg-green-400/10 border-green-400/30"
                : comment.fact_check_status === "misleading"
                ? "text-red-400 bg-red-400/10 border-red-400/30"
                : "text-gray-500 bg-gray-500/10 border-gray-700"
            )}
          >
            {comment.fact_check_status}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const postId  = params.id as string;
  const isDemo  = postId.startsWith("demo-");

  const [post, setPost]                   = useState<ForumPostDetailData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [advisorResponse, setAdvisorResponse] = useState<AIResponse | null>(null);
  const [advisorLoading, setAdvisorLoading]   = useState(false);

  const [newComment, setNewComment]   = useState("");
  const [stakeAmount, setStakeAmount] = useState(0);
  const [showStake, setShowStake]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isDemo) {
      const demoData = DEMO_POSTS_DATA[postId];
      if (demoData) {
        setPost(toForumPostDetailData(demoData));
        setError(null);
        setLoading(false);
        // Simulate AI loading for demo
        setAdvisorLoading(true);
        timeoutId = setTimeout(() => {
          setAdvisorResponse(DEMO_AI[postId] ?? null);
          setAdvisorLoading(false);
        }, 1400);
      } else {
        setError("Post not found");
        setLoading(false);
      }
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    fetchForumPost(postId)
      .then((postData) => {
        setPost(postData);
        setError(null);
        setLoading(false);
        const cached = postData.aiResponse;
        if (cached) {
          setAdvisorResponse(cached as unknown as AIResponse);
        } else {
          setAdvisorLoading(true);
          fetch("/api/advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
          })
            .then((r) => r.json())
            .then((ai) => { if (!ai.error) setAdvisorResponse(ai as AIResponse); })
            .catch(console.error)
            .finally(() => setAdvisorLoading(false));
        }
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [postId, isDemo]);

  async function handleComment() {
    if (!newComment.trim() || isDemo) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createAnswer(postId, newComment.trim());
      const updated = await fetchForumPost(postId);
      setPost(updated);
      setNewComment("");
      setStakeAmount(0);
      setShowStake(false);
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-32 rounded-lg bg-gray-800 animate-pulse" />
        <div className="h-48 rounded-xl bg-gray-900 animate-pulse" />
        <div className="h-24 rounded-xl bg-gray-900 animate-pulse" />
        <div className="h-32 rounded-xl bg-gray-900 animate-pulse" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-8 text-center">
        <p className="text-red-400">{error || "Post not found"}</p>
        <button
          onClick={() => router.push("/feed")}
          className="mt-4 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const comments    = post.answers ?? [];
  const authorName  = post.author.displayName;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/feed")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </button>

      {/* Post */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            TOPIC_COLORS[post.topic]
          )}>
            {post.topic}
          </span>
          {post.resolved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 border border-green-400/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Resolved
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-100">{post.title}</h1>
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.body}</p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>posted by</span>
            <span className="text-gray-300 font-medium">{authorName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* AI Consensus — between post and comments */}
      {advisorLoading && <AIConsensusLoading />}
      {!advisorLoading && advisorResponse && (
        <AIConsensusCard ai={advisorResponse} comments={comments} />
      )}

      {/* Comments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            {comments.length} Opinion{comments.length !== 1 ? "s" : ""}
          </p>
          {comments.length > 0 && (
            <p className="text-xs text-gray-600">Sorted by credibility</p>
          )}
        </div>

        {comments.length === 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-500 text-sm">No opinions yet. Share yours below.</p>
          </div>
        )}

        {comments.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            isAccepted={c.id === post.acceptedAnswerId}
            postTopic={post.topic}
          />
        ))}
      </div>

      {/* Post opinion */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
          Share Your Opinion
        </p>

        <textarea
          className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-gray-100 placeholder:text-gray-600 focus:border-amber-400 focus:outline-none transition-colors resize-none text-sm"
          placeholder="Share what you know. Your credibility in this topic influences how much Buddy weights your opinion in the consensus summary."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          disabled={isDemo}
        />

        {/* Wager toggle */}
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowStake(!showStake)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-gray-300 font-medium">Wager credibility on this opinion</span>
              <span className="text-[10px] font-mono text-gray-600">optional</span>
            </div>
            {showStake
              ? <ChevronUp className="h-4 w-4 text-gray-600" />
              : <ChevronDown className="h-4 w-4 text-gray-600" />
            }
          </button>

          {showStake && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Stake credibility points on your opinion. If the community and AI consensus agree with you, you earn points. If not, you lose them. High-staked opinions from credible users carry more weight in Buddy&apos;s summary.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={25}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(+e.target.value)}
                  className="flex-1 accent-amber-400"
                  disabled={isDemo}
                />
                <div className="shrink-0 w-24 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-mono text-sm text-amber-400 font-bold">{stakeAmount}</span>
                </div>
              </div>
              {stakeAmount > 0 && (
                <p className="text-[11px] text-amber-400/60">
                  You&apos;re wagering {stakeAmount} credibility points on this opinion.
                </p>
              )}
            </div>
          )}
        </div>

        {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

        {isDemo && (
          <p className="text-xs text-gray-600 italic">Sign in to post your opinion on real questions.</p>
        )}

        <button
          onClick={handleComment}
          disabled={submitting || newComment.trim().length < 10 || isDemo}
          className="px-6 py-2.5 bg-amber-400 text-gray-950 font-semibold text-sm rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-colors"
        >
          {submitting ? "Posting…" : stakeAmount > 0 ? `Post & Wager ${stakeAmount} pts` : "Post Opinion"}
        </button>
      </div>
    </div>
  );
}
