/**
 * GET /api/seed
 *
 * Seeds the Supabase database with realistic demo data.
 * Safe to call multiple times — uses upsert / existence checks throughout.
 *
 * Call once by visiting /api/seed in the browser (or curl).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

// ─── Users ───────────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { email: "guest@buddy-demo.local",  password: "buddy-demo-guest-2026", username: "you",            display_name: "You",    university: null },
  { email: "alex@buddy-demo.local",   password: "demo-password-1",       username: "alex_uni",       display_name: "Alex",   university: "UCL" },
  { email: "priya@buddy-demo.local",  password: "demo-password-2",       username: "fin_curious",    display_name: "Priya",  university: "LSE" },
  { email: "jamie@buddy-demo.local",  password: "demo-password-3",       username: "invest_newbie",  display_name: "Jamie",  university: "Imperial College London" },
  { email: "sam@buddy-demo.local",    password: "demo-password-4",       username: "angry_renter",   display_name: "Sam",    university: "King's College London" },
  { email: "rohan@buddy-demo.local",  password: "demo-password-5",       username: "global_student", display_name: "Rohan",  university: "University of Edinburgh" },
  { email: "emma@buddy-demo.local",   password: "demo-password-6",       username: "grad_2025",      display_name: "Emma",   university: "University of Manchester" },
];

// ─── Extra credibility events ─────────────────────────────────────────────────
// The signup trigger gives 100 pts. These bring users to realistic tiers.
// Reason "seed_data_bonus" is checked to avoid duplication.

const CREDIBILITY_SEEDS: Record<string, { delta: number; reason: string; topic?: string }[]> = {
  alex_uni: [
    { delta: 100, reason: "answer_accepted",  topic: "budgeting"  },
    { delta: 100, reason: "answer_accepted",  topic: "savings"    },
    { delta: 75,  reason: "answer_upvoted",   topic: "budgeting"  },
    { delta: 50,  reason: "answer_upvoted",   topic: "general"    },
    { delta: 25,  reason: "streak_bonus",     topic: undefined    },
  ], // total ~450 → contributor

  fin_curious: [
    { delta: 150, reason: "answer_accepted",  topic: "investing"  },
    { delta: 150, reason: "answer_accepted",  topic: "overdraft"  },
    { delta: 150, reason: "answer_accepted",  topic: "savings"    },
    { delta: 100, reason: "answer_accepted",  topic: "budgeting"  },
    { delta: 100, reason: "answer_accepted",  topic: "loans"      },
    { delta: 100, reason: "streak_bonus",     topic: undefined    },
    { delta: 75,  reason: "answer_upvoted",   topic: "investing"  },
    { delta: 50,  reason: "module_completed", topic: "budgeting"  },
    { delta: 25,  reason: "resource_shared",  topic: "savings"    },
  ], // total ~1000 → advisor

  invest_newbie: [
    { delta: 150, reason: "answer_accepted",  topic: "investing"  },
    { delta: 100, reason: "answer_accepted",  topic: "rent"       },
    { delta: 100, reason: "answer_accepted",  topic: "savings"    },
    { delta: 75,  reason: "answer_upvoted",   topic: "investing"  },
    { delta: 75,  reason: "streak_bonus",     topic: undefined    },
    { delta: 50,  reason: "answer_upvoted",   topic: "general"    },
  ], // total ~650 → trusted

  angry_renter: [
    { delta: 50,  reason: "answer_upvoted",   topic: "rent"       },
    { delta: 30,  reason: "answer_upvoted",   topic: "budgeting"  },
  ], // total ~180 → learner

  global_student: [
    { delta: 100, reason: "answer_accepted",  topic: "general"    },
    { delta: 75,  reason: "answer_upvoted",   topic: "budgeting"  },
    { delta: 50,  reason: "answer_accepted",  topic: "rent"       },
  ], // total ~325 → contributor

  grad_2025: [
    { delta: 150, reason: "answer_accepted",  topic: "loans"      },
    { delta: 100, reason: "answer_accepted",  topic: "overdraft"  },
    { delta: 100, reason: "answer_upvoted",   topic: "savings"    },
    { delta: 75,  reason: "streak_bonus",     topic: undefined    },
    { delta: 25,  reason: "answer_upvoted",   topic: "budgeting"  },
  ], // total ~550 → contributor
};

// ─── Posts ────────────────────────────────────────────────────────────────────

const DEMO_POSTS = [
  // ── BUDGETING ──
  {
    authorEmail: "alex@buddy-demo.local",
    title: "How much should I realistically budget for groceries each week as a student in London?",
    body: "I just moved to London for uni and I'm completely lost on how much to spend on food. My flatmates seem to spend wildly different amounts — one spends £25, another £80. Is £50/week reasonable or am I missing something about London prices?",
    topic: "budgeting",
    resolved: true,
    daysAgo: 28,
    views: 412,
  },
  {
    authorEmail: "sam@buddy-demo.local",
    title: "I'm spending £45/month on subscriptions I barely use — is a full audit actually worth the effort?",
    body: "Netflix (£6.99), Spotify (£5.99), Disney+ (£4.99), an old gym membership (£20), and some cloud storage (£2.99). That's £40.96/month. I use Netflix and Spotify daily but the rest rarely. Is it worth spending time auditing all of this or am I over-thinking a fairly small amount?",
    topic: "budgeting",
    resolved: false,
    daysAgo: 14,
    views: 187,
  },
  {
    authorEmail: "rohan@buddy-demo.local",
    title: "My rent is 64% of my income — is this actually sustainable or should I be seriously worried?",
    body: "I earn about £1,100/month from part-time work and my rent is £700. That leaves £400 for everything else — food, transport, phone, everything. I know 30% is the typical benchmark but is that just an outdated rule for London students? Is this ratio going to cause problems?",
    topic: "budgeting",
    resolved: false,
    daysAgo: 7,
    views: 243,
  },
  {
    authorEmail: "emma@buddy-demo.local",
    title: "Is it worth switching to cash-only spending for a month to fix my overspending, or does it actually backfire?",
    body: "I can't seem to stop impulse buying when I tap my card — it feels too abstract. Someone suggested going cash-only for a month to reset my habits. Has anyone actually tried this? Does the psychological effect last, or do you just go back to bad habits when you switch back to card?",
    topic: "budgeting",
    resolved: true,
    daysAgo: 21,
    views: 319,
  },

  // ── INVESTING ──
  {
    authorEmail: "jamie@buddy-demo.local",
    title: "Is the Vanguard FTSE All-World ETF a reasonable first investment for a student with £50/month?",
    body: "I've read about index fund investing and keep seeing Vanguard recommended. Is a global ETF suitable for someone just starting with small monthly amounts and a 10-year+ horizon? What platform should I use — InvestEngine, Freetrade, or something else?",
    topic: "investing",
    resolved: true,
    daysAgo: 25,
    views: 534,
  },
  {
    authorEmail: "emma@buddy-demo.local",
    title: "I have £200 sitting idle in my current account — is it actually worth investing such a small amount?",
    body: "I keep hearing 'start investing early' but £200 feels too small to matter. Transaction fees, complexity, tax reporting — is this worth the overhead for a student? Or am I better off just putting it in a savings account and waiting until I have more?",
    topic: "investing",
    resolved: false,
    daysAgo: 10,
    views: 298,
  },
  {
    authorEmail: "alex@buddy-demo.local",
    title: "My friend says I should invest my maintenance loan in an index fund and live frugally. Is this actually smart?",
    body: "A friend on economics said you should put the maintenance loan in a stocks ISA since the interest rate on student debt is below average market returns. He claims he's doing this. Feels risky to me — if the market drops 30% when I need to pay rent I'm in trouble. Is this actually a sensible approach?",
    topic: "investing",
    resolved: false,
    daysAgo: 5,
    views: 621,
  },
  {
    authorEmail: "priya@buddy-demo.local",
    title: "Is dollar-cost averaging into a global ETF genuinely better than saving up and investing a lump sum?",
    body: "I've read arguments both ways. DCA feels safer psychologically but someone told me statistically lump-sum investing beats DCA 2/3 of the time because markets trend up. For a student investing £100-150/month with no lump sum available, does this debate even matter or is DCA just the obvious choice?",
    topic: "investing",
    resolved: true,
    daysAgo: 18,
    views: 445,
  },

  // ── SAVINGS ──
  {
    authorEmail: "rohan@buddy-demo.local",
    title: "Premium bonds vs easy-access savings account — which is genuinely better for £2,000 I won't touch for a year?",
    body: "I have £2,000 in a current account earning nothing. Premium bonds offer a 4.4% equivalent prize rate and no risk. But a Marcus savings account offers 4.7% AER guaranteed. The premium bonds feel more exciting but is the guaranteed rate always better? Does the prize-rate figure account for the randomness?",
    topic: "savings",
    resolved: true,
    daysAgo: 16,
    views: 389,
  },
  {
    authorEmail: "alex@buddy-demo.local",
    title: "Is it worth opening a Lifetime ISA before I turn 40 even if I don't plan to buy a house?",
    body: "I keep hearing about the 25% government bonus on LISAs. But I'm not sure I want to buy a house in the UK long-term. Can I still use it for retirement instead? What are the penalties if I withdraw early for something else? Is the 25% penalty on withdrawal worse than just not using it?",
    topic: "savings",
    resolved: false,
    daysAgo: 3,
    views: 271,
  },
  {
    authorEmail: "sam@buddy-demo.local",
    title: "My parents offered to match whatever I save up to £500. Should I prioritise this over clearing my overdraft?",
    body: "My parents said they'll match pound-for-pound whatever I save this term up to £500, essentially giving me a 100% return. But I also have a £600 0% overdraft. Mathematically the parental match beats clearing the overdraft. But something feels off about leaving debt sitting there. What's the right call?",
    topic: "savings",
    resolved: false,
    daysAgo: 9,
    views: 156,
  },

  // ── RENT ──
  {
    authorEmail: "jamie@buddy-demo.local",
    title: "Studio alone at £750/month vs splitting a 4-bed at £550 each — is the premium for privacy worth it?",
    body: "I have the option of a studio flat to myself at £750/month or a 4-bed house with 3 strangers at £550 each. That's £200/month difference — £2,400/year. I value my own space and studying quietly. But £200/month is a lot for a student. How do I actually decide if the mental health benefit justifies the financial cost?",
    topic: "rent",
    resolved: true,
    daysAgo: 20,
    views: 502,
  },
  {
    authorEmail: "rohan@buddy-demo.local",
    title: "My landlord is offering £50/month off rent if I sign a 2-year lease instead of 1-year. Should I commit?",
    body: "Current rent is £650/month on a 1-year contract. Landlord offered £600/month for a 2-year commitment — saving £600 over 2 years. But I don't know where I'll be living in 18 months. If I break the lease early there could be costs. Is the £50/month saving worth the reduced flexibility?",
    topic: "rent",
    resolved: false,
    daysAgo: 6,
    views: 134,
  },
  {
    authorEmail: "emma@buddy-demo.local",
    title: "45-minute commute at £450/month rent vs 10-minute walk at £750 — which is actually cheaper total?",
    body: "I'm deciding between a place 45 mins from campus (train + bus, about £90/month on transport) at £450 rent vs living 10 mins walk from campus at £750 rent. Commute option saves £210/month on rent but costs £90 on transport, netting £120 saving. But is the 90 minutes of commuting daily (30 days × 1.5 hours) worth more than £120/month of my time?",
    topic: "rent",
    resolved: true,
    daysAgo: 30,
    views: 677,
  },

  // ── OVERDRAFT ──
  {
    authorEmail: "priya@buddy-demo.local",
    title: "Should I pay off my student overdraft or start building a savings fund first?",
    body: "I have a £800 student overdraft that's 0% interest, but I also want to start saving for emergencies. Do I tackle the overdraft first or split my monthly surplus between both? Mathematically 0% debt seems low priority but I'm not sure.",
    topic: "overdraft",
    resolved: false,
    daysAgo: 12,
    views: 328,
  },
  {
    authorEmail: "priya@buddy-demo.local",
    title: "Best 0% student bank accounts in 2025 — which has the highest overdraft limit?",
    body: "I need a student bank account with a decent 0% overdraft. I've seen Santander, HSBC, and Nationwide mentioned. Which one is actually best right now and are there any catches I should know about?",
    topic: "overdraft",
    resolved: true,
    daysAgo: 35,
    views: 891,
  },
  {
    authorEmail: "sam@buddy-demo.local",
    title: "My student 0% overdraft converts to a fee-charging graduate account in June — what's the smartest way to clear £900 in 5 months?",
    body: "I have £900 in my student overdraft and graduate in June. After that, the 0% becomes a fee-charging facility. I earn about £400/month part-time. Is it realistic to clear £900 in 5 months on this income? Should I put everything at it or is there a smarter approach — balance transfers, anything?",
    topic: "overdraft",
    resolved: false,
    daysAgo: 4,
    views: 203,
  },

  // ── LOANS ──
  {
    authorEmail: "emma@buddy-demo.local",
    title: "I'm on Plan 2 student loan — at my expected salary, will I ever actually pay it off?",
    body: "I'm graduating next year expecting to earn around £28k. After doing some rough maths it seems like my loan will be written off before I clear it anyway. Is it even worth making overpayments? I've heard the Plan 2 write-off is after 30 years. At £28k starting salary, does the maths suggest I should just ignore it and invest instead?",
    topic: "loans",
    resolved: false,
    daysAgo: 8,
    views: 743,
  },
  {
    authorEmail: "alex@buddy-demo.local",
    title: "My maintenance loan doesn't cover my rent — is it better to take a part-time job or a personal loan to bridge the gap?",
    body: "My maintenance loan is £9,706/year (£809/month) but my rent alone is £850/month. That's already underwater before food, transport, or anything else. My parents can't help. I'm considering either a part-time job (10-15 hrs/week) or a small personal loan to bridge the gap. Which approach is actually less harmful to my finances and degree?",
    topic: "loans",
    resolved: true,
    daysAgo: 15,
    views: 556,
  },

  // ── GENERAL ──
  {
    authorEmail: "rohan@buddy-demo.local",
    title: "Does using Wise to send money home actually save compared to a UK bank transfer?",
    body: "My family is back in India and I want to send £200 home monthly. My bank charges a flat £15 fee plus a terrible exchange rate. Is Wise genuinely cheaper or is the marketing misleading? I want to understand the real total cost difference.",
    topic: "general",
    resolved: true,
    daysAgo: 22,
    views: 478,
  },
  {
    authorEmail: "jamie@buddy-demo.local",
    title: "Is getting a 0% purchase credit card as a student a good way to build a credit score, or is it too risky?",
    body: "I have no credit history. A friend said applying for a 0% purchase credit card and paying it off in full every month is the best free way to build a credit score quickly. But I'm worried I'll slip up and end up paying interest. Is the credit score benefit actually worth the risk for a student who's not great with money?",
    topic: "general",
    resolved: false,
    daysAgo: 11,
    views: 345,
  },
];

// ─── Answers ──────────────────────────────────────────────────────────────────

// postKey = first 50 chars of post title (used for matching)
const DEMO_ANSWERS: {
  postKey: string;
  authorEmail: string;
  content: string;
  isAccepted?: boolean;
  factCheckStatus?: string;
}[] = [
  // ── Groceries budgeting ──
  {
    postKey: "How much should I realistically budget for groceries",
    authorEmail: "priya@buddy-demo.local",
    content: "£50/week is very doable in London if you're strategic. Shop at Aldi or Lidl — you'll cut 30-40% off a Tesco bill for almost identical quality. Meal prep Sunday evenings and batch-cook pasta, rice dishes, and soups. Critically: stop buying lunch on campus daily. That alone can cost £6-8/day (£30-40/week). I manage on about £35-40 including toiletries. The biggest win is buying meat in bulk when on offer and freezing portions.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "How much should I realistically budget for groceries",
    authorEmail: "jamie@buddy-demo.local",
    content: "£50/week is the average I see quoted for London students. Useful hacks: Too Good To Go app gets you restaurant surplus food for £2-3 (worth £8-10). Yellow sticker items at Tesco after 7pm. Check if your uni has a food bank — many do and there's no stigma, it's a student benefit. Also: cooking for yourself is way cheaper than even the 'cheap' meal deals which are often 2x the cost of home cooking per calorie.",
    factCheckStatus: "accurate",
  },
  {
    postKey: "How much should I realistically budget for groceries",
    authorEmail: "rohan@buddy-demo.local",
    content: "From my experience as an international student: £40-50 is achievable if you adjust what you eat. I was used to cooking South Asian food at home which is actually cheaper in the UK — lentils, chickpeas, rice, spices from Indian grocery stores are significantly cheaper than equivalent Western ingredients per meal. Don't assume you need to eat the same as home. Adapting your diet to what's cheap locally saves real money.",
    factCheckStatus: "pending",
  },

  // ── Subscriptions audit ──
  {
    postKey: "I'm spending £45/month on subscriptions I barely use",
    authorEmail: "priya@buddy-demo.local",
    content: "Absolutely worth 30 minutes of your time. £40.96/month is £491/year — that's a flight to Europe or 2 months of food. For a student that's not 'small'. Cancel Disney+ and the gym immediately (you're paying for something you don't use). Use Spotify's student discount (£5.99 → £2.99). Check if your university provides cloud storage free. The psychological weight of paying for things you don't use also quietly affects your relationship with money.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "I'm spending £45/month on subscriptions I barely use",
    authorEmail: "alex@buddy-demo.local",
    content: "The gym membership is the obvious one — if you haven't been in 2 months, cancel today, not 'next month'. For the rest: try the 30-day test. If you don't actively miss something in 30 days after cancelling, you didn't need it. I did this and cut my subscriptions from £52/month to £14. The Disney+ withdrawal lasted about 3 days. Most university students also get free Spotify Premium through Unidays or their student email.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── 64% rent-to-income ──
  {
    postKey: "My rent is 64% of my income — is this actually sustainable",
    authorEmail: "emma@buddy-demo.local",
    content: "64% is genuinely high and I'd be concerned. The 30% 'rule' is outdated for London but even so, 64% leaves you with £400 for everything else — food, transport, phone, going out, unexpected costs. One unexpected expense (phone screen, dental, travel) and you're in your overdraft. The practical question is: can you increase income rather than cutting costs further? Even 5 extra hours of paid work would make a meaningful difference at your expense level.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My rent is 64% of my income — is this actually sustainable",
    authorEmail: "priya@buddy-demo.local",
    content: "The 30% rule originated in US housing policy in the 1960s and is not meaningful for London students. What matters is whether your remaining £400 covers necessities. Break it down: £40-50/week food (£200), transport (£50-80 depending on Oyster/Travelcard zone), phone (£10-15 sim-only). That leaves around £100-150 buffer. It's tight but survivable with zero luxuries. The real risk is any variable cost — you have no margin for error. Consider if there's any way to earn an extra £100-150/month.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Cash-only month ──
  {
    postKey: "Is it worth switching to cash-only spending for a month",
    authorEmail: "jamie@buddy-demo.local",
    content: "I did this for 6 weeks after my spending got out of control. It genuinely works as a short-term reset — handing over physical notes makes purchases feel real in a way tapping a card doesn't. The pain point is that it's inconvenient enough that you skip small impulse purchases ('I don't have change, forget it'). The effect lasted about 2 months after switching back before old habits crept in. It's worth doing once as a diagnostic tool to see what you're actually spending on.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Is it worth switching to cash-only spending for a month",
    authorEmail: "sam@buddy-demo.local",
    content: "I tried it and hated it — carrying cash felt stressful and I lost £20 at one point. What actually worked better for me was using Monzo's spending pots. You lock specific amounts in pots labelled 'food', 'going out', 'transport' and can only spend from them. When the pot's empty, it's empty. Same psychological friction as cash but without carrying notes. Worth trying before going full cash-only.",
    factCheckStatus: "accurate",
  },

  // ── Vanguard ETF ──
  {
    postKey: "Is the Vanguard FTSE All-World ETF a reasonable first",
    authorEmail: "rohan@buddy-demo.local",
    content: "Yes, FTSE All-World (VWRL) is exactly what most evidence-based investors recommend for beginners — 0.22% ongoing charge, exposure to ~3,700 companies across 50+ countries, no stock-picking. For platform: InvestEngine is zero-fee for ETFs which is significant on small amounts (Hargreaves Lansdown charges 0.45% platform fee on top). £50/month at 7% historical real return over 10 years compounds to roughly £8,700. Start now — time in market beats timing the market.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Is the Vanguard FTSE All-World ETF a reasonable first",
    authorEmail: "priya@buddy-demo.local",
    content: "Good choice but consider the Stocks & Shares ISA wrapper. If you hold outside an ISA, capital gains above £3,000/year and dividends above £500/year are taxable. At £50/month you probably won't hit those limits for years, but starting inside an ISA is a good habit and costs nothing extra. InvestEngine and Freetrade both offer ISAs. One note: VWRL pays dividends quarterly — if you want accumulating units (reinvests automatically), look at VWRP which is the accumulating version.",
    factCheckStatus: "accurate",
  },

  // ── £200 to invest ──
  {
    postKey: "I have £200 sitting idle in my current account — is it",
    authorEmail: "alex@buddy-demo.local",
    content: "£200 is not too small to invest. The whole point of platforms like InvestEngine (no transaction fees) is that any amount is viable. £200 in VWRL will compound. The real question is: is this money you might need in the next 1-2 years? If yes, keep it in a savings account. Stock market money should have a 5+ year horizon because you need time to ride out downturns. If you have no emergency fund, build that first — 1-2 months expenses in easy-access savings before you invest anything.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "I have £200 sitting idle in my current account — is it",
    authorEmail: "priya@buddy-demo.local",
    content: "The overhead argument doesn't hold — modern investment apps have no transaction fees and tax reporting is only relevant if you exceed the CGT allowance (£3,000) or dividend allowance (£500). At £200 you won't. Put it in a Stocks & Shares ISA, buy a global index fund, and forget it. One caveat: if you have any 0% overdraft debt, debate whether to clear that first. £200 in debt vs £200 invested — mathematically identical if the debt is 0%, but psychologically clearing debt first often leads to better financial habits.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Maintenance loan in index fund ──
  {
    postKey: "My friend says I should invest my maintenance loan in an",
    authorEmail: "emma@buddy-demo.local",
    content: "Your instinct is right to be cautious. The argument works in theory — student loan interest (currently RPI+0% for Plan 5, Plan 2 varies) may be below long-term market returns of ~7%. But it ignores: (1) sequence risk — if markets drop 30% in month 1 and your rent is due, you're in serious trouble; (2) student loans are not callable — they don't demand repayment when markets fall; a margin call on your rent money is catastrophic. This is a fine idea for money you genuinely don't need for 12+ months, not your rent fund.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My friend says I should invest my maintenance loan in an",
    authorEmail: "jamie@buddy-demo.local",
    content: "I actually did a version of this — but only with money genuinely surplus after budgeting 3 months of living costs as a cash buffer. So I kept £2,500 in a high-yield savings account as my 'can't touch' living fund, then invested the remainder (about £1,200) in a global ETF. The separation is key. If you're investing money you might need for rent, one bad month will force you to sell at a loss. The strategy itself isn't wrong, just needs to be structured safely.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── DCA vs lump sum ──
  {
    postKey: "Is dollar-cost averaging into a global ETF genuinely bet",
    authorEmail: "alex@buddy-demo.local",
    content: "For your situation as a student investing from income, this debate is basically irrelevant. DCA vs lump sum only matters when you have a lump sum to invest. If you earn £100-150 extra per month and invest it as it comes in, that IS lump-sum investing with each month's surplus. You don't have a choice to invest it all at once. Focus on increasing the amount you invest rather than optimising the timing strategy — contribution rate has 10x more impact than DCA vs lump sum for small investors.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Is dollar-cost averaging into a global ETF genuinely bet",
    authorEmail: "rohan@buddy-demo.local",
    content: "The statistic that lump sum beats DCA 66% of the time is correct but misleading for most investors — it assumes you have a lump sum sitting idle, which students typically don't. DCA is psychologically superior because it removes the 'is now a good time' question entirely. Markets are at all-time highs frequently — that's what a growing economy looks like. Waiting for a better entry point costs more in missed returns than DCA timing ever loses.",
    factCheckStatus: "accurate",
  },

  // ── Premium bonds vs Marcus ──
  {
    postKey: "Premium bonds vs easy-access savings account — which is",
    authorEmail: "priya@buddy-demo.local",
    content: "For £2,000 over 1 year: the guaranteed 4.7% AER at Marcus mathematically beats premium bonds' 4.4% prize rate. The 4.4% is an expected value figure but it's a probability-weighted average — you could win more or less. At £2,000, the distribution of prizes is quite wide (most months you win nothing, occasionally something). The guaranteed rate wins for predictability. That said, premium bond winnings are tax-free which matters if you're a higher-rate taxpayer — as a student you almost certainly aren't, so stick with the Marcus account.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Premium bonds vs easy-access savings account — which is",
    authorEmail: "emma@buddy-demo.local",
    content: "Premium bonds are excellent if you're a higher earner paying tax on savings interest. Students earning under the personal allowance (£12,570) get £500 tax-free savings interest anyway — so you likely owe no tax on savings interest regardless. This removes premium bonds' main advantage. Go with the guaranteed higher rate (Marcus, Chip, or similar). Check that the account has no notice period if you want genuine easy access — some 'easy access' accounts have 30-95 day notice requirements.",
    factCheckStatus: "accurate",
  },

  // ── LISA for retirement ──
  {
    postKey: "Is it worth opening a Lifetime ISA before I turn 40 eve",
    authorEmail: "jamie@buddy-demo.local",
    content: "Open one now — even put £1 in. The 25% bonus is the best guaranteed return available. You can use it for first home purchase (property up to £450k) OR retirement from age 60. The early withdrawal penalty is 25% of the withdrawal amount — this means you lose the bonus AND about 6.25% of your own money, so it's punitive. But if you treat it as retirement/house money and don't touch it, there's no downside. Moneybox and AJ Bell have decent LISA products. Opening early maximises your annual £4,000 contribution limit usage.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Is it worth opening a Lifetime ISA before I turn 40 eve",
    authorEmail: "priya@buddy-demo.local",
    content: "Strongly recommend opening one. Key facts: you earn the 25% bonus on up to £4,000/year (£1,000 bonus max annually). If you put in £4,000 at age 20 and never contribute again, it becomes £5,000 before growth. For retirement specifically: from age 60 you can withdraw everything tax-free, unlike a pension where you pay income tax on 75% of withdrawals. For students, a LISA for retirement can actually beat a pension below certain contribution levels. One important constraint: you must open it before age 40.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Parents matching savings ──
  {
    postKey: "My parents offered to match whatever I save up to £500",
    authorEmail: "alex@buddy-demo.local",
    content: "The parental match is a 100% guaranteed instant return — nothing else in finance gives you that. Clear maths: putting £500 in savings gives you £1,000 (effectively). Paying £500 off 0% overdraft gives you £500 of debt reduction. The match wins by £500. Only exception: if your overdraft is costing you money (fees, or a graduation date where it starts charging interest soon), factor that in. But assuming truly 0% for the foreseeable: hit the match first, then redirect savings to overdraft.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My parents offered to match whatever I save up to £500",
    authorEmail: "emma@buddy-demo.local",
    content: "Maximise the match — full stop. A 100% return is extraordinary and something you'll probably never see again (until employer pension matching in your career). The 0% overdraft argument for paying that first would only make sense if there were no match. I'd suggest: save £500 immediately to get the match, then use the resulting £1,000 to do both — pay off the overdraft (£600) and keep £400 as a starter emergency fund. Best of all worlds.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Studio vs 4-bed ──
  {
    postKey: "Studio alone at £750/month vs splitting a 4-bed at £550",
    authorEmail: "priya@buddy-demo.local",
    content: "This is a values question disguised as a financial one. Financially: £200/month × 12 = £2,400/year extra for the studio. That's real money. But ask: how many hours/day are you actually at home studying? If you're at the library most of the day, you're paying £200/month for a quiet space you use 4 hours. If you genuinely study at home and shared noise would tank your grades, the studio might be worth it — worse grades have a larger lifetime financial impact than £2,400/year.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Studio alone at £750/month vs splitting a 4-bed at £550",
    authorEmail: "rohan@buddy-demo.local",
    content: "I moved from a shared house to a studio after one particularly bad year with incompatible flatmates. My grades went up, my anxiety went down. Worth every penny for me. But I know people who shared with great housemates and had the best experience of their student life. The key variable isn't the flat type — it's the people. Can you pick your flatmates? A compatible 4-person house beats a studio both financially and for wellbeing. An incompatible shared house can be genuinely damaging to academic performance.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── 2-year lease ──
  {
    postKey: "My landlord is offering £50/month off rent if I sign a 2",
    authorEmail: "emma@buddy-demo.local",
    content: "Read the break clause carefully. Most 2-year ASTs (Assured Shorthold Tenancies) in England have a 6-month break clause — meaning you can exit after 12-18 months with 2 months' notice. If there's a break clause at month 12, the risk is much lower than a truly locked-in 2 years. Ask specifically: 'Is there a break clause and at what point?' If yes and you're confident staying 12+ months, £600 saving with minimal risk is a good deal. If no break clause, be very cautious — life changes fast as a student.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My landlord is offering £50/month off rent if I sign a 2",
    authorEmail: "alex@buddy-demo.local",
    content: "The maths is attractive but the optionality cost is real. You're essentially paying £50/month for the option to move — question is whether that option is worth it to you. If your course, job prospects, or relationship status might change in 18 months, flexibility has real value. If you're settled and confident, take the deal. Also negotiate: try asking for £75/month off — the worst they can say is no. Landlords offering discounts are usually trying to avoid void periods which cost them more than the discount.",
    factCheckStatus: "accurate",
  },

  // ── Commute vs proximity ──
  {
    postKey: "45-minute commute at £450/month rent vs 10-minute walk",
    authorEmail: "jamie@buddy-demo.local",
    content: "Your own maths shows £120/month saving for the commute option — that's £1,440/year. But you're undervaluing your time. 90 minutes of commuting daily × 200 uni days = 300 hours/year. If you value your time at even £8/hour (minimum wage), that's £2,400/year of time cost — nearly double the rental saving. And commuting time is mostly unproductive (packed tube, stress), whereas living nearby means you can sleep later, exercise more, attend evening events. The numbers favour living close if you can manage the extra £120/month.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "45-minute commute at £450/month rent vs 10-minute walk",
    authorEmail: "sam@buddy-demo.local",
    content: "I commuted for a full year and deeply regretted it. The £120/month saving felt real; the daily 90-minute grind felt worse over time, not better. I was consistently late to 9am lectures, missed loads of spontaneous social stuff that required being nearby, and found it harder to use the library or stay late for study groups. There are hidden costs too — you might spend more on coffee/food on the commute. Unless you have a strong reason to be in that area (family, existing community), proximity to campus is underrated.",
    factCheckStatus: "accurate",
  },

  // ── Overdraft vs savings ──
  {
    postKey: "Should I pay off my student overdraft or start building",
    authorEmail: "emma@buddy-demo.local",
    content: "If your overdraft is genuinely 0% interest (check the small print for fees), mathematically there's no cost to carrying it. The emergency fund argument wins: without savings, any unexpected expense (£200 car repair, dental, travel home) forces you back into the overdraft anyway. I'd do 50/50: build a starter emergency fund of £500 first (gives you a buffer), then throw everything at the overdraft. Don't try to do both equally — prioritise the emergency fund until you have a meaningful cushion.",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Should I pay off my student overdraft or start building",
    authorEmail: "alex@buddy-demo.local",
    content: "The psychological case for clearing debt first is real even when the maths doesn't demand it. Carrying debt — even 0% — can cause low-level financial anxiety that affects decision-making and spending. But practically: a savings buffer prevents you going deeper into overdraft when anything goes wrong. One pragmatic approach — use the overdraft as your emergency fund intentionally. Treat going into it as 'spending savings', set a mental limit (say £300) as your buffer, and work to bring the total balance to zero over 6 months. The 0% rate means time is on your side.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Best student bank account ──
  {
    postKey: "Best 0% student bank accounts in 2025 — which has the",
    authorEmail: "jamie@buddy-demo.local",
    content: "As of 2025: Santander Edge Student (£1,500 0% overdraft in year 1, up to £2,000 by year 3) is strong if you use their linked cashback. HSBC Student Account (up to £3,000 0% by year 3) has the highest ceiling. Nationwide FlexStudent (up to £3,000 by year 3, fee-free worldwide ATM withdrawals) is excellent for international use. The catches: most require proof of student status each year, and the headline overdraft limit builds over time — you don't get the max in year 1. Don't chase the highest limit if you don't need it; just don't go near the limit and you'll pay nothing.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Best 0% student bank accounts in 2025 — which has the",
    authorEmail: "priya@buddy-demo.local",
    content: "Beyond overdraft limits: check the switching incentives. Banks often pay £100-200 to switch, which is free money. Starling and Monzo don't offer 0% overdrafts in the traditional sense but have much better budgeting tools and zero foreign transaction fees — worth considering alongside a traditional student account (you can have both). One underrated factor: customer service quality. You don't want to discover your bank is hard to reach when you have a fraud issue at 11pm before a rent payment.",
    factCheckStatus: "accurate",
  },

  // ── Graduate overdraft ──
  {
    postKey: "My student 0% overdraft converts to a fee-charging gradu",
    authorEmail: "priya@buddy-demo.local",
    content: "£900 in 5 months on £400/month income is tough — that's £180/month just for the overdraft. Realistic plan: (1) Check if your bank offers a graduate account that tapers the 0% period — many give you 1-2 years grace post-graduation before charging fees. HSBC Graduate gives £3,000 at 0% for 1 year. This buys you more time. (2) Look for a 0% money transfer credit card — transfers your overdraft balance to the card at 0% for 12-20 months. This converts urgent debt into managed debt. (3) Clear £180-200/month and have it gone in 5 months if your income increases post-graduation.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My student 0% overdraft converts to a fee-charging gradu",
    authorEmail: "emma@buddy-demo.local",
    content: "Don't panic — graduate accounts from most banks extend the 0% period. Call your bank now and ask specifically about their graduate account transition. Most will automatically switch you and maintain 0% for at least 12 months. If you're graduating in June and can't clear it by then, the priority is to not accrue interest, not necessarily to clear it all immediately. Getting a graduate job (even minimum wage full-time) changes your ability to clear this completely within 3-4 months of starting work.",
    factCheckStatus: "accurate",
  },

  // ── Plan 2 loans ──
  {
    postKey: "I'm on Plan 2 student loan — at my expected salary, wil",
    authorEmail: "priya@buddy-demo.local",
    content: "At £28k starting salary, Plan 2 repayments are 9% of everything above £27,295 — so about £63/year (yes, £63/year, not per month). Your loan grows faster with interest than you repay it. The write-off is at 30 years. Based on typical salary growth, most graduates at £28k starting will not clear their Plan 2 loan before write-off. This means: your effective 'tuition cost' is approximately the £63/year you'll pay for 30 years = ~£1,890 total, NOT the £50,000+ headline figure. Overpaying is almost certainly wrong unless you expect to be a very high earner (£60k+).",
    isAccepted: false,
    factCheckStatus: "accurate",
  },
  {
    postKey: "I'm on Plan 2 student loan — at my expected salary, wil",
    authorEmail: "alex@buddy-demo.local",
    content: "The student loan for most Plan 2 graduates functions more like a graduate tax than a loan. The decision to overpay only makes financial sense if you'll earn enough to clear it before 30 years (roughly £45k+ average career salary). At £28k, the interest rate means your balance grows each year regardless of repayments. Use any spare money for ISA contributions, pension contributions, or clearing actual commercial debt (overdraft, credit card) — all of these have clearer financial benefit than voluntary student loan repayments at your income level.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },

  // ── Part-time job vs personal loan ──
  {
    postKey: "My maintenance loan doesn't cover my rent — is it better",
    authorEmail: "priya@buddy-demo.local",
    content: "Part-time job, absolutely. A personal loan for a student is typically 15-30% APR — you'd pay £135-270 in interest over a year on £900 borrowed. A part-time job of 10 hours/week at minimum wage (£11.44/hour) generates £457/month — that's more than the gap you need to fill. Yes it affects study time, but students routinely manage 10-15 hours alongside full study loads. Personal loans at student rates are expensive and should be a true last resort. Also: have you checked all bursaries and hardship funds your university offers? These are grants, not loans.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "My maintenance loan doesn't cover my rent — is it better",
    authorEmail: "jamie@buddy-demo.local",
    content: "Check your university's hardship fund first — most universities have emergency funds for exactly this situation and they don't need to be repaid. Also check whether you're getting the correct maintenance loan amount — if your household income is under £25k the maximum is higher. If you do take a job: 10-12 hours/week is manageable; 15+ starts to affect study quality for most people. Avoid a personal loan — the interest rate for students without credit history is punishing. Contact your student finance team first.",
    factCheckStatus: "accurate",
  },

  // ── Wise vs bank transfer ──
  {
    postKey: "Does using Wise to send money home actually save compare",
    authorEmail: "priya@buddy-demo.local",
    content: "Yes, Wise is genuinely cheaper. For £200 to India: Wise charges roughly 0.5-0.7% in fees (about £1.00-1.40) and uses the mid-market exchange rate. Your bank charges £15 flat fee PLUS typically 3-4% exchange rate margin (£6-8 on £200). Total bank cost: ~£21-23. Total Wise cost: ~£1.40. The savings are very real — especially compounded over 12 months of transfers. I've used Wise for 3 years without issues. The transfers arrive in 1-3 hours to most Indian banks.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Does using Wise to send money home actually save compare",
    authorEmail: "emma@buddy-demo.local",
    content: "Wise is legitimate and well-regulated (FCA authorised in the UK). For recurring transfers, also check Revolut — their international transfer rates are competitive and if you're already using them for daily spending, the integration is seamless. One comparison to consider: for large amounts (£500+), also check Xe.com and CurrencyFair, which can be slightly cheaper than Wise at higher volumes. For your £200/month use case, Wise is the simplest and best option.",
    factCheckStatus: "accurate",
  },

  // ── Credit card for credit score ──
  {
    postKey: "Is getting a 0% purchase credit card as a student a good",
    authorEmail: "alex@buddy-demo.local",
    content: "The strategy is correct but requires discipline. A 0% purchase card used correctly (spend small amounts, pay in full every month, never carry a balance) builds your credit score with zero cost. The risk is real: if you miss a payment or carry a balance when the 0% period ends, the rate jumps to 20-30% APR. Mitigations: set a direct debit for the full balance every month (not minimum payment), keep the credit limit low if your bank offers that option, and use the card only for a single recurring purchase (like Spotify) so you can't overspend on it.",
    isAccepted: true,
    factCheckStatus: "accurate",
  },
  {
    postKey: "Is getting a 0% purchase credit card as a student a good",
    authorEmail: "emma@buddy-demo.local",
    content: "If you're 'not great with money' by your own admission, I'd be cautious about a credit card. The credit score benefit is real but achievable other ways (credit-builder products, being on the electoral roll, keeping accounts in good standing). An alternative: a credit-builder card like Aqua or Capital One (designed for thin credit files) with a very low limit (£200-500). These are harder to overspend on. The credit score building takes 12-18 months to show meaningful improvement regardless of which route you take.",
    factCheckStatus: "accurate",
  },
];

// ─── Votes ────────────────────────────────────────────────────────────────────
// Defined as triplets: [voterEmail, answerAuthorEmail, postKeyPrefix, value]
// Inserted after answers are created, matching on post + author.

const DEMO_VOTES: [string, string, string, 1 | -1][] = [
  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "How much should I realistically budget for groceries", 1],
  ["jamie@buddy-demo.local",  "priya@buddy-demo.local",  "How much should I realistically budget for groceries", 1],
  ["rohan@buddy-demo.local",  "priya@buddy-demo.local",  "How much should I realistically budget for groceries", 1],
  ["sam@buddy-demo.local",    "priya@buddy-demo.local",  "How much should I realistically budget for groceries", 1],
  ["priya@buddy-demo.local",  "jamie@buddy-demo.local",  "How much should I realistically budget for groceries", 1],
  ["rohan@buddy-demo.local",  "jamie@buddy-demo.local",  "How much should I realistically budget for groceries", 1],

  ["priya@buddy-demo.local",  "alex@buddy-demo.local",   "I'm spending £45/month on subscriptions", 1],
  ["jamie@buddy-demo.local",  "alex@buddy-demo.local",   "I'm spending £45/month on subscriptions", 1],
  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "I'm spending £45/month on subscriptions", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "My rent is 64% of my income", 1],
  ["jamie@buddy-demo.local",  "priya@buddy-demo.local",  "My rent is 64% of my income", 1],
  ["emma@buddy-demo.local",   "priya@buddy-demo.local",  "My rent is 64% of my income", 1],

  ["priya@buddy-demo.local",  "jamie@buddy-demo.local",  "Is it worth switching to cash-only spending", 1],
  ["alex@buddy-demo.local",   "jamie@buddy-demo.local",  "Is it worth switching to cash-only spending", 1],
  ["emma@buddy-demo.local",   "sam@buddy-demo.local",    "Is it worth switching to cash-only spending", 1],

  ["alex@buddy-demo.local",   "rohan@buddy-demo.local",  "Is the Vanguard FTSE All-World ETF", 1],
  ["sam@buddy-demo.local",    "rohan@buddy-demo.local",  "Is the Vanguard FTSE All-World ETF", 1],
  ["emma@buddy-demo.local",   "rohan@buddy-demo.local",  "Is the Vanguard FTSE All-World ETF", 1],
  ["priya@buddy-demo.local",  "rohan@buddy-demo.local",  "Is the Vanguard FTSE All-World ETF", 1],
  ["rohan@buddy-demo.local",  "priya@buddy-demo.local",  "Is the Vanguard FTSE All-World ETF", 1],

  ["priya@buddy-demo.local",  "priya@buddy-demo.local",  "I have £200 sitting idle", -1],  // self-vote test guard (will be skipped)
  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "I have £200 sitting idle", 1],
  ["jamie@buddy-demo.local",  "priya@buddy-demo.local",  "I have £200 sitting idle", 1],

  ["priya@buddy-demo.local",  "emma@buddy-demo.local",   "My friend says I should invest my maintenance", 1],
  ["alex@buddy-demo.local",   "emma@buddy-demo.local",   "My friend says I should invest my maintenance", 1],
  ["priya@buddy-demo.local",  "jamie@buddy-demo.local",  "My friend says I should invest my maintenance", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "Premium bonds vs easy-access savings", 1],
  ["jamie@buddy-demo.local",  "priya@buddy-demo.local",  "Premium bonds vs easy-access savings", 1],
  ["sam@buddy-demo.local",    "emma@buddy-demo.local",   "Premium bonds vs easy-access savings", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "Is it worth opening a Lifetime ISA", 1],
  ["sam@buddy-demo.local",    "priya@buddy-demo.local",  "Is it worth opening a Lifetime ISA", 1],
  ["rohan@buddy-demo.local",  "jamie@buddy-demo.local",  "Is it worth opening a Lifetime ISA", 1],

  ["alex@buddy-demo.local",   "emma@buddy-demo.local",   "My parents offered to match whatever I save", 1],
  ["priya@buddy-demo.local",  "emma@buddy-demo.local",   "My parents offered to match whatever I save", 1],

  ["priya@buddy-demo.local",  "rohan@buddy-demo.local",  "Studio alone at £750/month vs splitting", 1],
  ["alex@buddy-demo.local",   "rohan@buddy-demo.local",  "Studio alone at £750/month vs splitting", 1],
  ["sam@buddy-demo.local",    "rohan@buddy-demo.local",  "Studio alone at £750/month vs splitting", 1],

  ["priya@buddy-demo.local",  "emma@buddy-demo.local",   "My landlord is offering £50/month off rent", 1],
  ["jamie@buddy-demo.local",  "emma@buddy-demo.local",   "My landlord is offering £50/month off rent", 1],

  ["priya@buddy-demo.local",  "jamie@buddy-demo.local",  "45-minute commute at £450/month", 1],
  ["alex@buddy-demo.local",   "jamie@buddy-demo.local",  "45-minute commute at £450/month", 1],
  ["emma@buddy-demo.local",   "jamie@buddy-demo.local",  "45-minute commute at £450/month", 1],
  ["priya@buddy-demo.local",  "sam@buddy-demo.local",    "45-minute commute at £450/month", 1],

  ["priya@buddy-demo.local",  "alex@buddy-demo.local",   "Should I pay off my student overdraft", 1],
  ["jamie@buddy-demo.local",  "alex@buddy-demo.local",   "Should I pay off my student overdraft", 1],

  ["alex@buddy-demo.local",   "jamie@buddy-demo.local",  "Best 0% student bank accounts", 1],
  ["sam@buddy-demo.local",    "jamie@buddy-demo.local",  "Best 0% student bank accounts", 1],
  ["rohan@buddy-demo.local",  "jamie@buddy-demo.local",  "Best 0% student bank accounts", 1],
  ["emma@buddy-demo.local",   "priya@buddy-demo.local",  "Best 0% student bank accounts", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "I'm on Plan 2 student loan", 1],
  ["jamie@buddy-demo.local",  "priya@buddy-demo.local",  "I'm on Plan 2 student loan", 1],
  ["sam@buddy-demo.local",    "alex@buddy-demo.local",   "I'm on Plan 2 student loan", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "My maintenance loan doesn't cover my rent", 1],
  ["sam@buddy-demo.local",    "priya@buddy-demo.local",  "My maintenance loan doesn't cover my rent", 1],
  ["rohan@buddy-demo.local",  "jamie@buddy-demo.local",  "My maintenance loan doesn't cover my rent", 1],

  ["alex@buddy-demo.local",   "priya@buddy-demo.local",  "Does using Wise to send money home", 1],
  ["emma@buddy-demo.local",   "priya@buddy-demo.local",  "Does using Wise to send money home", 1],
  ["sam@buddy-demo.local",    "priya@buddy-demo.local",  "Does using Wise to send money home", 1],

  ["priya@buddy-demo.local",  "alex@buddy-demo.local",   "Is getting a 0% purchase credit card", 1],
  ["jamie@buddy-demo.local",  "alex@buddy-demo.local",   "Is getting a 0% purchase credit card", 1],
  ["emma@buddy-demo.local",   "alex@buddy-demo.local",   "Is getting a 0% purchase credit card", 1],
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: Record<string, unknown> = {};

  // ── 1. Create auth users + profiles ────────────────────────────────────────
  const emailToId: Record<string, string> = {};
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 200 });

  for (const u of DEMO_USERS) {
    const found = existingUsers?.users?.find((usr) => usr.email === u.email);
    let userId: string;

    if (found) {
      userId = found.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { username: u.username, display_name: u.display_name },
      });
      if (error) { results[`user_${u.username}`] = `error: ${error.message}`; continue; }
      userId = data.user.id;
    }

    emailToId[u.email] = userId;

    await supabase.from("profiles").upsert(
      {
        id: userId,
        username: u.username,
        display_name: u.display_name,
        university: u.university,
        onboarding_complete: true,
        financial_snapshot: { income: 1100, expenses: 850, goals: ["save_emergency_fund", "budget_better"] },
      },
      { onConflict: "id" }
    );
    results[`profile_${u.username}`] = "ok";
  }

  // ── 2. Credibility events (idempotent via reason=seed_data_bonus check) ────
  for (const [username, events] of Object.entries(CREDIBILITY_SEEDS)) {
    const user = DEMO_USERS.find((u) => u.username === username);
    if (!user) continue;
    const userId = emailToId[user.email];
    if (!userId) continue;

    const { data: existing } = await supabase
      .from("credibility_events")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "seed_data_bonus")
      .maybeSingle();

    if (existing) { results[`cred_${username}`] = "already seeded"; continue; }

    // Insert a marker event first, then the real events
    await supabase.from("credibility_events").insert({ user_id: userId, delta: 0, reason: "seed_data_bonus" });

    for (const ev of events) {
      await supabase.from("credibility_events").insert({
        user_id: userId,
        delta: ev.delta,
        reason: ev.reason,
        ...(ev.topic ? { topic: ev.topic } : {}),
      });
    }
    results[`cred_${username}`] = `seeded ${events.length} events`;
  }

  // ── 3. Posts ────────────────────────────────────────────────────────────────
  const titleToPostId: Record<string, string> = {};

  for (const p of DEMO_POSTS) {
    const authorId = emailToId[p.authorEmail];
    if (!authorId) continue;

    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("author_id", authorId)
      .ilike("title", `${p.title.slice(0, 60)}%`)
      .maybeSingle();

    if (existing) {
      titleToPostId[p.title.slice(0, 60)] = existing.id;
      results[`post_${p.title.slice(0, 30)}`] = "exists";
      continue;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: authorId,
        title: p.title,
        body: p.body,
        topic: p.topic,
        resolved: p.resolved,
        view_count: p.views,
        created_at: daysAgo(p.daysAgo),
        updated_at: daysAgo(p.daysAgo),
      })
      .select("id")
      .single();

    if (error) {
      results[`post_${p.title.slice(0, 30)}`] = `error: ${error.message}`;
    } else {
      titleToPostId[p.title.slice(0, 60)] = data.id;
      results[`post_${p.title.slice(0, 30)}`] = "created";
    }
  }

  // ── 4. Answers ──────────────────────────────────────────────────────────────
  // Map: "postId|authorId" → answerId
  const answerKeyToId: Record<string, string> = {};

  for (const a of DEMO_ANSWERS) {
    const authorId = emailToId[a.authorEmail];
    // Match post by prefix
    const postEntry = Object.entries(titleToPostId).find(([k]) =>
      a.postKey.toLowerCase().startsWith(k.toLowerCase().slice(0, 40)) ||
      k.toLowerCase().startsWith(a.postKey.toLowerCase().slice(0, 40))
    );
    const postId = postEntry?.[1];
    if (!authorId || !postId) { results[`answer_miss_${a.postKey.slice(0, 20)}`] = "no post/author"; continue; }

    const key = `${postId}|${authorId}`;

    const { data: existing } = await supabase
      .from("answers")
      .select("id")
      .eq("post_id", postId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (existing) {
      answerKeyToId[key] = existing.id;
      results[`answer_${a.postKey.slice(0, 20)}_${a.authorEmail.split("@")[0]}`] = "exists";
      continue;
    }

    const { data, error } = await supabase
      .from("answers")
      .insert({
        post_id: postId,
        author_id: authorId,
        content: a.content,
        fact_check_status: a.factCheckStatus ?? "pending",
      })
      .select("id")
      .single();

    if (error) {
      results[`answer_${a.postKey.slice(0, 20)}`] = `error: ${error.message}`;
    } else {
      answerKeyToId[key] = data.id;
      results[`answer_${a.postKey.slice(0, 20)}_${a.authorEmail.split("@")[0]}`] = "created";
    }
  }

  // ── 5. Mark accepted answers on resolved posts ──────────────────────────────
  for (const p of DEMO_POSTS.filter((p) => p.resolved)) {
    const postEntry = Object.entries(titleToPostId).find(([k]) =>
      p.title.toLowerCase().startsWith(k.toLowerCase().slice(0, 40)) ||
      k.toLowerCase().startsWith(p.title.toLowerCase().slice(0, 40))
    );
    const postId = postEntry?.[1];
    if (!postId) continue;

    // Find the accepted answer for this post
    const acceptedAnswer = DEMO_ANSWERS.find(
      (a) =>
        a.isAccepted &&
        (a.postKey.toLowerCase().startsWith(p.title.toLowerCase().slice(0, 40)) ||
          p.title.toLowerCase().startsWith(a.postKey.toLowerCase().slice(0, 40)))
    );
    if (!acceptedAnswer) continue;

    const authorId = emailToId[acceptedAnswer.authorEmail];
    if (!authorId) continue;

    const answerId = answerKeyToId[`${postId}|${authorId}`];
    if (!answerId) continue;

    const { error } = await supabase
      .from("posts")
      .update({ accepted_answer_id: answerId })
      .eq("id", postId)
      .is("accepted_answer_id", null); // only if not already set

    results[`accepted_${p.title.slice(0, 30)}`] = error ? `error: ${error.message}` : "set";
  }

  // ── 6. Votes ────────────────────────────────────────────────────────────────
  for (const [voterEmail, answerAuthorEmail, postKeyPrefix, value] of DEMO_VOTES) {
    const voterId = emailToId[voterEmail];
    const authorId = emailToId[answerAuthorEmail];
    if (!voterId || !authorId || voterId === authorId) continue; // no self-votes

    // Find the post
    const postEntry = Object.entries(titleToPostId).find(([k]) =>
      postKeyPrefix.toLowerCase().startsWith(k.toLowerCase().slice(0, 40)) ||
      k.toLowerCase().startsWith(postKeyPrefix.toLowerCase().slice(0, 35))
    );
    const postId = postEntry?.[1];
    if (!postId) continue;

    const answerId = answerKeyToId[`${postId}|${authorId}`];
    if (!answerId) continue;

    // Check existing vote
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("voter_id", voterId)
      .eq("answer_id", answerId)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("votes").insert({
      voter_id: voterId,
      answer_id: answerId,
      value,
      voter_credibility_at_vote: 100,
    });
  }

  results["summary"] = {
    users: DEMO_USERS.length,
    posts: DEMO_POSTS.length,
    answers: DEMO_ANSWERS.length,
    votes: DEMO_VOTES.length,
  };

  return NextResponse.json({ success: true, results });
}
