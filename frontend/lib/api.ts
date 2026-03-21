/**
 * Typed API client for the FastAPI backend.
 * Always attaches the Supabase access token as Bearer header.
 */
import { createClient } from "@/lib/supabase/client";
import type { AIResponse, AnswerEnriched, CredibilitySnapshot, Post } from "@/types/database";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeader(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ----------------------------------------------------------------
// Auth / Profile
// ----------------------------------------------------------------
export const api = {
  auth: {
    me: () => apiFetch<Post>("/auth/me"),
    onboarding: (payload: {
      display_name: string;
      university?: string;
      financial_snapshot?: object;
    }) =>
      apiFetch("/auth/onboarding", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // ----------------------------------------------------------------
  // Posts
  // ----------------------------------------------------------------
  posts: {
    list: (params?: { topic?: string; resolved?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.topic) qs.set("topic", params.topic);
      if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
      return apiFetch<Post[]>(`/posts/?${qs}`);
    },
    get: (postId: string) => apiFetch<Post & { answers_enriched: AnswerEnriched[] }>(`/posts/${postId}`),
    create: (payload: { title: string; body: string; topic: string }) =>
      apiFetch<Post>("/posts/", { method: "POST", body: JSON.stringify(payload) }),
    acceptAnswer: (postId: string, answerId: string) =>
      apiFetch(`/posts/${postId}/accept-answer`, {
        method: "POST",
        body: JSON.stringify({ answer_id: answerId }),
      }),
  },

  // ----------------------------------------------------------------
  // Answers
  // ----------------------------------------------------------------
  answers: {
    create: (payload: { post_id: string; content: string; stake_amount?: number }) =>
      apiFetch("/answers/", { method: "POST", body: JSON.stringify(payload) }),
    forPost: (postId: string) =>
      apiFetch<AnswerEnriched[]>(`/answers/post/${postId}`),
  },

  // ----------------------------------------------------------------
  // Votes
  // ----------------------------------------------------------------
  votes: {
    cast: (answerId: string, value: 1 | -1) =>
      apiFetch("/votes/", {
        method: "POST",
        body: JSON.stringify({ answer_id: answerId, value }),
      }),
  },

  // ----------------------------------------------------------------
  // Credibility
  // ----------------------------------------------------------------
  credibility: {
    me: () => apiFetch<CredibilitySnapshot>("/credibility/me"),
    user: (userId: string) => apiFetch<CredibilitySnapshot>(`/credibility/user/${userId}`),
    history: () => apiFetch("/credibility/me/history"),
    leaderboard: () => apiFetch("/credibility/leaderboard"),
  },

  // ----------------------------------------------------------------
  // Tools (instant AI checkers)
  // ----------------------------------------------------------------
  tools: {
    check: (tool: "grocery" | "purchase" | "investment", inputs: Record<string, string>) =>
      apiFetch<Record<string, unknown>>("/tools/check", {
        method: "POST",
        body: JSON.stringify({ tool, inputs }),
      }),
  },

  // ----------------------------------------------------------------
  // AI
  // ----------------------------------------------------------------
  ai: {
    getResponse: (postId: string) =>
      apiFetch<AIResponse | null>(`/posts/${postId}`).then(
        (p: { ai_responses?: { response_json: AIResponse } | null }) =>
          p.ai_responses?.response_json ?? null
      ),
  },
};
