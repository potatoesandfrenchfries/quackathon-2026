/**
 * TypeScript types mirroring the Supabase schema.
 * Keep in sync with supabase/migrations/001_initial_schema.sql
 */

export type Topic =
  | "rent"
  | "loans"
  | "budgeting"
  | "investing"
  | "overdraft"
  | "savings"
  | "general";

export type CredTier =
  | "newcomer"
  | "learner"
  | "contributor"
  | "trusted"
  | "advisor"
  | "oracle";

export type FactCheckStatus = "pending" | "accurate" | "misleading" | "unverified";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  university: string | null;
  avatar_url: string | null;
  financial_snapshot: FinancialSnapshot;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialSnapshot {
  income?: number;
  expenses?: number;
  goals?: string[];
  top_worry?: string;
}

export interface CredibilityEvent {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  topic: Topic | null;
  reference_id: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  body: string;
  topic: Topic;
  resolved: boolean;
  accepted_answer_id: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  profiles?: Pick<Profile, "username" | "display_name">;
  ai_responses?: { response_json: AIResponse } | null;
}

export interface Answer {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  stake_amount: number;
  fact_check_status: FactCheckStatus;
  fact_check_confidence: number | null;
  fact_check_evidence: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerEnriched extends Answer {
  author_username: string;
  author_display_name: string | null;
  author_total_cred: number;
  author_topic_cred: number;
  vote_total: number;
  vote_count: number;
}

export interface AIResponse {
  summary: string;
  action: string;
  confidence: number;
  top_source_username?: string;
  top_source_cred?: number;
  reasoning?: string;
  disclaimer: string;
  resources?: string[];
  real_world_note?: string | null;
}

export type ChallengeStatus = "active" | "completed" | "abandoned";

export interface Challenge {
  id: string;
  created_by: string | null;
  title: string;
  description: string;
  topic: Topic | null;
  target_description: string;
  duration_days: number;
  participant_count: number;
  completed_count: number;
  is_active: boolean;
  created_at: string;
  // Joined on GET /{id}
  my_participation?: ChallengeParticipant | null;
  // Joined on recommended
  recommendation_reason?: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  join_number: number;
  status: ChallengeStatus;
  checkin_streak: number;
  last_checkin_at: string | null;
  completed_at: string | null;
  joined_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  color: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export type AssignmentDifficulty = "easy" | "medium" | "hard";
export type AssignmentStatus = "todo" | "in_progress" | "completed";

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  due_date: string; // "YYYY-MM-DD"
  difficulty: AssignmentDifficulty;
  status: AssignmentStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredibilitySnapshot {
  user_id: string;
  total_score: number;
  tier: CredTier;
  tier_color: string;
  topic_scores: Partial<Record<Topic, number>>;
}

// Database type for supabase-js generics (simplified)
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      answers: { Row: Answer; Insert: Partial<Answer>; Update: Partial<Answer> };
      credibility_events: { Row: CredibilityEvent; Insert: Partial<CredibilityEvent>; Update: never };
    };
    Views: {
      user_total_credibility: { Row: { user_id: string; total_score: number } };
      user_topic_credibility: { Row: { user_id: string; topic: Topic; score: number } };
      answers_enriched: { Row: AnswerEnriched };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
