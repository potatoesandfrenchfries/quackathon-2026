/**
 * Unit tests for the typed API client (lib/api.ts).
 *
 * Supabase auth and global fetch are both mocked so no real network calls
 * are made. Tests verify URL construction, header injection, error handling,
 * and response transformations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing lib/api)
// ---------------------------------------------------------------------------

const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function errorResponse(status: number, detail: string) {
  return Promise.resolve({
    ok: false,
    statusText: `HTTP ${status}`,
    json: () => Promise.resolve({ detail }),
  });
}

function calledUrl(): string {
  return mockFetch.mock.calls[0][0] as string;
}

function calledInit(): RequestInit {
  return mockFetch.mock.calls[0][1] as RequestInit;
}

function calledHeaders(): Record<string, string> {
  return calledInit().headers as Record<string, string>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated session
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "test-token-abc" } },
  });
});

// ---------------------------------------------------------------------------
// Auth header injection
// ---------------------------------------------------------------------------

describe("auth header", () => {
  it("attaches Bearer token from session", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list();
    expect(calledHeaders()["Authorization"]).toBe("Bearer test-token-abc");
  });

  it("omits Authorization when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list();
    expect(calledHeaders()["Authorization"]).toBeUndefined();
  });

  it("always sets Content-Type: application/json", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list();
    expect(calledHeaders()["Content-Type"]).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws with server detail message on non-ok response", async () => {
    mockFetch.mockReturnValueOnce(errorResponse(404, "Post not found"));
    const { api } = await import("@/lib/api");
    await expect(api.posts.get("bad-id")).rejects.toThrow("Post not found");
  });

  it("falls back to statusText when response has no detail", async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      })
    );
    const { api } = await import("@/lib/api");
    await expect(api.posts.list()).rejects.toThrow("Internal Server Error");
  });
});

// ---------------------------------------------------------------------------
// posts.list()
// ---------------------------------------------------------------------------

describe("api.posts.list", () => {
  it("calls /posts/ with no extra params by default", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list();
    expect(calledUrl()).toContain("/posts/");
  });

  it("appends topic query param", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list({ topic: "loans" });
    expect(calledUrl()).toContain("topic=loans");
  });

  it("appends resolved=true", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list({ resolved: true });
    expect(calledUrl()).toContain("resolved=true");
  });

  it("appends resolved=false", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list({ resolved: false });
    expect(calledUrl()).toContain("resolved=false");
  });

  it("appends both topic and resolved", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.posts.list({ topic: "savings", resolved: false });
    const url = calledUrl();
    expect(url).toContain("topic=savings");
    expect(url).toContain("resolved=false");
  });
});

// ---------------------------------------------------------------------------
// posts.create()
// ---------------------------------------------------------------------------

describe("api.posts.create", () => {
  it("sends POST with correct body", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ id: "p1" }));
    const { api } = await import("@/lib/api");
    await api.posts.create({ title: "Help needed", body: "I need help", topic: "loans" });
    const body = JSON.parse(calledInit().body as string);
    expect(body).toEqual({ title: "Help needed", body: "I need help", topic: "loans" });
    expect(calledInit().method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// posts.acceptAnswer()
// ---------------------------------------------------------------------------

describe("api.posts.acceptAnswer", () => {
  it("sends POST to correct URL with answer_id body", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ok: true }));
    const { api } = await import("@/lib/api");
    await api.posts.acceptAnswer("post-1", "ans-2");
    expect(calledUrl()).toContain("/posts/post-1/accept-answer");
    const body = JSON.parse(calledInit().body as string);
    expect(body).toEqual({ answer_id: "ans-2" });
  });
});

// ---------------------------------------------------------------------------
// answers.create()
// ---------------------------------------------------------------------------

describe("api.answers.create", () => {
  it("sends POST with payload including stake_amount", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ id: "a1" }));
    const { api } = await import("@/lib/api");
    await api.answers.create({ post_id: "p1", content: "My answer", stake_amount: 50 });
    const body = JSON.parse(calledInit().body as string);
    expect(body.stake_amount).toBe(50);
    expect(body.content).toBe("My answer");
  });
});

// ---------------------------------------------------------------------------
// votes.cast()
// ---------------------------------------------------------------------------

describe("api.votes.cast", () => {
  it("sends correct answer_id and value=1 for upvote", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ok: true }));
    const { api } = await import("@/lib/api");
    await api.votes.cast("answer-123", 1);
    const body = JSON.parse(calledInit().body as string);
    expect(body).toEqual({ answer_id: "answer-123", value: 1 });
  });

  it("sends value=-1 for downvote", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ok: true }));
    const { api } = await import("@/lib/api");
    await api.votes.cast("answer-456", -1);
    const body = JSON.parse(calledInit().body as string);
    expect(body.value).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// ai.getResponse()
// ---------------------------------------------------------------------------

describe("api.ai.getResponse", () => {
  const mockAIResponse = {
    summary: "Open a Lifetime ISA",
    action: "Apply via GOV.UK",
    confidence: 82,
    reasoning: "Tax-free savings bonus for first-time buyers.",
    resources: [],
  };

  it("extracts nested response_json", async () => {
    mockFetch.mockReturnValueOnce(
      okResponse({ ai_responses: { response_json: mockAIResponse } })
    );
    const { api } = await import("@/lib/api");
    const result = await api.ai.getResponse("post-abc");
    expect(result).toEqual(mockAIResponse);
  });

  it("returns null when ai_responses is null", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ ai_responses: null }));
    const { api } = await import("@/lib/api");
    const result = await api.ai.getResponse("post-abc");
    expect(result).toBeNull();
  });

  it("returns null when ai_responses is missing", async () => {
    mockFetch.mockReturnValueOnce(okResponse({}));
    const { api } = await import("@/lib/api");
    const result = await api.ai.getResponse("post-abc");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// credibility routes
// ---------------------------------------------------------------------------

describe("api.credibility", () => {
  it("credibility.me calls /credibility/me", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ total_score: 250, tier: "learner" }));
    const { api } = await import("@/lib/api");
    await api.credibility.me();
    expect(calledUrl()).toContain("/credibility/me");
  });

  it("credibility.user calls correct user path", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ total_score: 700, tier: "trusted" }));
    const { api } = await import("@/lib/api");
    await api.credibility.user("user-xyz");
    expect(calledUrl()).toContain("/credibility/user/user-xyz");
  });

  it("credibility.leaderboard calls /credibility/leaderboard", async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));
    const { api } = await import("@/lib/api");
    await api.credibility.leaderboard();
    expect(calledUrl()).toContain("/credibility/leaderboard");
  });
});
