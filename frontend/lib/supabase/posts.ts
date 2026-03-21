import { createBrowserClient } from "@supabase/ssr";
import type { Post, AnswerEnriched, Topic } from "@/types/database";

// Use untyped client here — the Database generic's Insert types include
// joined fields (profiles, ai_responses) which confuse supabase-js insert().
function db() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchPosts(topic?: Topic): Promise<Post[]> {
  const supabase = db();
  let query = supabase
    .from("posts")
    .select("*, profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Post[];
}

export async function fetchPost(
  postId: string
): Promise<Post & { answers_enriched: AnswerEnriched[] }> {
  const supabase = db();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*, profiles(username, display_name), ai_responses(response_json)")
    .eq("id", postId)
    .single();

  if (postError) throw new Error(postError.message);

  const { data: answers } = await supabase
    .from("answers_enriched")
    .select("*")
    .eq("post_id", postId)
    .order("vote_total", { ascending: false });

  return {
    ...(post as unknown as Post),
    answers_enriched: (answers ?? []) as unknown as AnswerEnriched[],
  };
}

export async function createPost(payload: {
  title: string;
  body: string;
  topic: Topic;
}): Promise<Post> {
  const supabase = db();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Session not ready — please wait a moment and try again.");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: payload.title,
      body: payload.body,
      topic: payload.topic,
    })
    .select("*, profiles(username, display_name)")
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Post;
}

export async function createAnswer(postId: string, content: string): Promise<void> {
  const supabase = db();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Session not ready — please wait a moment and try again.");

  const { error } = await supabase
    .from("answers")
    .insert({ post_id: postId, author_id: user.id, content });

  if (error) throw new Error(error.message);
}

export async function castVote(answerId: string, value: 1 | -1): Promise<void> {
  const supabase = db();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No user — silently skip (optimistic UI still shows the change locally)
  if (!user) return;

  const { error } = await supabase
    .from("votes")
    .upsert(
      { voter_id: user.id, answer_id: answerId, value },
      { onConflict: "voter_id,answer_id" }
    );

  // Non-fatal — optimistic update already applied in the UI
  if (error) console.warn("[castVote] failed:", error.message);
}
