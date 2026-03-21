/**
 * GET /api/seed
 *
 * Seeds the Supabase database with demo users + posts so the forum has real
 * clickable content. Safe to call multiple times — uses upsert throughout.
 *
 * Call once by visiting /api/seed in the browser (or curl).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DEMO_USERS = [
  // Shared guest account — every visitor auto-signs in as this user
  { email: "guest@buddy-demo.local",  password: "buddy-demo-guest-2026", username: "you",           display_name: "You",   bio: "Demo visitor" },
  { email: "alex@buddy-demo.local",   password: "demo-password-1",       username: "alex_uni",      display_name: "Alex",  bio: "2nd year Economics @ UCL" },
  { email: "priya@buddy-demo.local",  password: "demo-password-2",       username: "fin_curious",   display_name: "Priya", bio: "MSc Finance student, money nerd" },
  { email: "jamie@buddy-demo.local",  password: "demo-password-3",       username: "invest_newbie", display_name: "Jamie", bio: "Engineering student dabbling in index funds" },
  { email: "sam@buddy-demo.local",    password: "demo-password-4",       username: "angry_renter",  display_name: "Sam",   bio: "Final year, struggling with London rent" },
  { email: "rohan@buddy-demo.local",  password: "demo-password-5",       username: "global_student",display_name: "Rohan", bio: "International student (India → UK)" },
  { email: "emma@buddy-demo.local",   password: "demo-password-6",       username: "grad_2025",     display_name: "Emma",  bio: "Graduating 2025, thinking about student loans" },
];

const DEMO_POSTS = [
  {
    authorEmail: "alex@buddy-demo.local",
    title: "How much should I realistically budget for groceries each week as a student in London?",
    body: "I just moved to London for uni and I'm completely lost on how much to spend on food. My flatmates seem to spend wildly different amounts. Is £50/week reasonable or am I missing something about London prices?",
    topic: "budgeting",
    resolved: true,
  },
  {
    authorEmail: "priya@buddy-demo.local",
    title: "Should I pay off my student overdraft or start building a savings fund first?",
    body: "I have a £800 student overdraft that's 0% interest, but I also want to start saving for emergencies. Do I tackle the overdraft first or split my monthly surplus between both?",
    topic: "overdraft",
    resolved: false,
  },
  {
    authorEmail: "jamie@buddy-demo.local",
    title: "Is the Vanguard FTSE All-World ETF a reasonable first investment for a student with £50/month?",
    body: "I've read about index fund investing and keep seeing Vanguard recommended. Is a global ETF suitable for someone just starting with small monthly amounts and a 10-year horizon? What platform should I use?",
    topic: "investing",
    resolved: true,
  },
  {
    authorEmail: "rohan@buddy-demo.local",
    title: "Does using Wise to send money home actually save compared to a UK bank transfer?",
    body: "My family is back in India and I want to send £200 home monthly. My bank charges a flat £15 fee plus a terrible exchange rate. Is Wise genuinely cheaper or is the marketing misleading?",
    topic: "general",
    resolved: true,
  },
  {
    authorEmail: "emma@buddy-demo.local",
    title: "I'm on Plan 2 student loan — at my expected salary, will I ever actually pay it off?",
    body: "I'm graduating next year expecting to earn around £28k. After doing some rough maths it seems like my loan will be written off before I clear it anyway. Is it even worth making overpayments?",
    topic: "loans",
    resolved: false,
  },
  {
    authorEmail: "alex@buddy-demo.local",
    title: "Is it worth opening a Lifetime ISA before I turn 40 even if I don't plan to buy a house?",
    body: "I keep hearing about the 25% government bonus on LISAs. But I'm not sure I want to buy a house in the UK long-term. Can I still use it for retirement instead? What are the penalties if I withdraw early?",
    topic: "savings",
    resolved: false,
  },
  {
    authorEmail: "priya@buddy-demo.local",
    title: "Best 0% student bank accounts in 2025 — which has the highest overdraft limit?",
    body: "I need a student bank account with a decent 0% overdraft. I've seen Santander, HSBC, and Nationwide mentioned. Which one is actually best right now and are there any catches I should know about?",
    topic: "overdraft",
    resolved: true,
  },
];

const DEMO_ANSWERS = [
  {
    postTitle: "How much should I realistically budget for groceries",
    authorEmail: "priya@buddy-demo.local",
    content: "£50/week is very doable in London if you're smart about it. Shop at Aldi or Lidl instead of Tesco/Sainsbury's — you'll easily cut 30-40% off your bill. Meal prep on Sundays. Avoid buying lunch on campus every day; that alone can save £20-30/week. I manage on about £35-40 including toiletries.",
  },
  {
    postTitle: "How much should I realistically budget for groceries",
    authorEmail: "jamie@buddy-demo.local",
    content: "Honestly £50 is the average I've seen for London students. The trick is using apps like Too Good To Go for surprise bags from local restaurants — I've gotten £10 worth of food for £3. Also check if your uni has a food bank or subsidised meals scheme.",
  },
  {
    postTitle: "Should I pay off my student overdraft or start building a savings fund",
    authorEmail: "emma@buddy-demo.local",
    content: "If your overdraft is genuinely 0% interest (check the small print for fees), mathematically it makes no difference whether you pay it first or save. But psychologically, having an emergency fund is crucial — without it, any unexpected expense puts you back in the overdraft anyway. I'd do 50/50: build £500 emergency fund first, then focus on overdraft.",
  },
  {
    postTitle: "Is the Vanguard FTSE All-World ETF a reasonable first investment",
    authorEmail: "rohan@buddy-demo.local",
    content: "Yes, FTSE All-World is exactly what most financial educators recommend for beginners — low cost (~0.22% OCF), globally diversified, no stock-picking needed. For platform: InvestEngine is zero-fee for ETFs which saves a lot on small amounts. £50/month over 10 years at historical 7% returns = roughly £8,700. Start now rather than later.",
  },

  {
    postTitle: "Does using Wise to send money home actually save",
    authorEmail: "priya@buddy-demo.local",
    content: "Yes, Wise is genuinely cheaper. For £200 to India, Wise charges roughly £1.80 in fees vs £15+ at a bank, and uses the mid-market exchange rate rather than a marked-up bank rate. The difference on exchange rate alone can be £5-8 per transfer. I've been using it for 2 years without issues.",
  },
  {
    postTitle: "Is it worth opening a Lifetime ISA",
    authorEmail: "jamie@buddy-demo.local",
    content: "Absolutely worth opening early. The 25% bonus is free money — on £4,000/year that's £1,000 from the government. You CAN use it for retirement (from age 60) not just house purchase. The penalty for non-qualifying withdrawals is 25% (which means you lose the bonus plus a bit more), so don't put money in you might need before 60. Moneybox and AJ Bell offer decent LISA products.",
  },
];

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

  // 1. Create auth users + profiles
  const emailToId: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    // Check if user already exists by listing users and matching email
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((user) => user.email === u.email);

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
      if (error) {
        results[`user_${u.username}`] = `error: ${error.message}`;
        continue;
      }
      userId = data.user.id;
    }

    emailToId[u.email] = userId;

    // Upsert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, username: u.username, display_name: u.display_name, bio: u.bio },
        { onConflict: "id" }
      );

    results[`profile_${u.username}`] = profileError ? `error: ${profileError.message}` : "ok";
  }

  // 2. Create posts
  const titleToId: Record<string, string> = {};

  for (const p of DEMO_POSTS) {
    const authorId = emailToId[p.authorEmail];
    if (!authorId) continue;

    // Check if post already exists (by title + author)
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("title", p.title)
      .eq("author_id", authorId)
      .maybeSingle();

    if (existing) {
      titleToId[p.title.slice(0, 40)] = existing.id;
      results[`post_${p.title.slice(0, 30)}`] = "already exists";
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
        view_count: Math.floor(Math.random() * 400) + 50,
      })
      .select("id")
      .single();

    if (error) {
      results[`post_${p.title.slice(0, 30)}`] = `error: ${error.message}`;
    } else {
      titleToId[p.title.slice(0, 40)] = data.id;
      results[`post_${p.title.slice(0, 30)}`] = "created";
    }
  }

  // 3. Create answers
  for (const a of DEMO_ANSWERS) {
    const authorId = emailToId[a.authorEmail];
    const postId = Object.entries(titleToId).find(([k]) =>
      a.postTitle.toLowerCase().startsWith(k.toLowerCase().slice(0, 30))
    )?.[1];

    if (!authorId || !postId) continue;

    const { data: existing } = await supabase
      .from("answers")
      .select("id")
      .eq("post_id", postId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (existing) {
      results[`answer_${a.postTitle.slice(0, 20)}`] = "already exists";
      continue;
    }

    const { error } = await supabase
      .from("answers")
      .insert({ post_id: postId, author_id: authorId, content: a.content });

    results[`answer_${a.postTitle.slice(0, 20)}`] = error ? `error: ${error.message}` : "created";
  }

  return NextResponse.json({ success: true, results });
}
