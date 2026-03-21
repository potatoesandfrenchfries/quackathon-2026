/**
 * AI Advisor Route Handler
 *
 * Ports the logic from backend/agents/advisor.py into a Next.js serverless function.
 * Uses Anthropic's web_search tool so Claude autonomously researches current UK
 * financial data before synthesising its advice — no stub RAG needed.
 *
 * POST /api/advisor  { postId: string }
 * Returns the parsed AIResponse JSON (and caches it in ai_responses table).
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Buddy, a peer financial guide for students in the UK.
You are NOT a regulated financial advisor. Always frame your guidance as educational.

You have access to a web search tool. Use it to find current, specific UK financial
information relevant to the question — e.g. current interest rates, typical prices,
FCA guidance, MoneyHelper resources, or relevant news. Search 1-3 times as needed.

You will receive:
- A student's financial question
- Community answers sorted by author credibility (highest first), with their
  topic-specific credibility score in parentheses
- Relevant context from your web searches

Your response MUST be valid JSON with this exact structure:
{
  "summary": "2-3 sentence summary of the community consensus and your research",
  "action": "One clear, specific action the student should take",
  "confidence": <integer 0-100>,
  "top_source_username": "<username of the most credible community answerer, or null>",
  "top_source_cred": <their credibility score, or null>,
  "reasoning": "Why you weighted that source most heavily (or why community input was limited)",
  "disclaimer": "This is educational guidance only, not regulated financial advice.",
  "resources": ["<url or resource name from your search>"]
}

Key rules:
- Explicitly mention credibility scores when citing community answers
- If no community answers exist, base response on web search + your knowledge
- Confidence < 50 if answers conflict significantly
- Be concrete: give numbers, thresholds, specific UK services (e.g. MoneyHelper, MoneySavingExpert)
- resources must include at least one URL from your web search if you searched
- Return ONLY the JSON object — no markdown fences, no extra text`;

function formatAnswers(answers: Record<string, unknown>[]): string {
  if (!answers?.length) return "No community answers yet.";
  return answers
    .map((a, i) => {
      const username = a.author_username ?? "unknown";
      const totalCred = a.author_total_cred ?? 0;
      const topicCred = a.author_topic_cred ?? 0;
      const votes = (a.vote_total as number) ?? 0;
      const factStatus = a.fact_check_status ?? "pending";
      return (
        `Answer #${i + 1} — @${username} ` +
        `(Total credibility: ${totalCred}, Topic credibility: ${topicCred}, ` +
        `Votes: ${votes > 0 ? "+" : ""}${votes}, Fact-check: ${factStatus})\n` +
        `${a.content}\n`
      );
    })
    .join("\n---\n");
}

export async function POST(req: NextRequest) {
  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Use service role key for DB writes (bypasses RLS on ai_responses).
  // Fall back to anon key for reads if service key not set.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- Cache check ---
  const { data: cached } = await supabase
    .from("ai_responses")
    .select("response_json")
    .eq("post_id", postId)
    .maybeSingle();

  if (cached?.response_json) {
    return NextResponse.json(cached.response_json);
  }

  // --- Fetch post ---
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*, profiles(username)")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // --- Fetch enriched answers sorted by credibility ---
  const { data: answers } = await supabase
    .from("answers_enriched")
    .select("*")
    .eq("post_id", postId)
    .order("author_total_cred", { ascending: false })
    .limit(10);

  const answersContext = formatAnswers(
    (answers ?? []) as Record<string, unknown>[]
  );

  const userMessage = `QUESTION: ${post.title}

${post.body}

COMMUNITY ANSWERS (sorted by author credibility, highest first):
${answersContext}

Please search the web for relevant current UK financial information on this topic before responding.`;

  // --- Call Claude with web search ---
  const client = new Anthropic({ apiKey: anthropicKey });

  let parsed: Record<string, unknown>;
  const betaMessages = client.beta.messages as unknown as {
    create: (args: Record<string, unknown>) => Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };

  try {
    const response = await betaMessages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      betas: ["web-search-2025-03-05"],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract the last text block (appears after any tool_use blocks)
    const textBlock = [...response.content]
      .reverse()
      .find((b: { type: string }) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;

    if (!textBlock) throw new Error("No text block in response");

    // Strip markdown fences if model wrapped the JSON anyway
    const raw = textBlock.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    console.error("[Advisor] Claude call failed:", err);
    return NextResponse.json(
      { error: "AI advisor call failed", detail: String(err) },
      { status: 500 }
    );
  }

  // --- Cache in DB (best-effort) ---
  if (serviceKey) {
    await supabase
      .from("ai_responses")
      .upsert(
        { post_id: postId, response_json: parsed, model_used: "claude-sonnet-4-6" },
        { onConflict: "post_id" }
      );
  }

  return NextResponse.json(parsed);
}
