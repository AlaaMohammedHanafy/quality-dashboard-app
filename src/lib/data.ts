import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  type Thresholds,
  type Weights,
} from "@/lib/quality";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  tutor_code: string | null;
  status: string;
};

export type RoleRow = { user_id: string; role: "admin" | "team_leader" | "mentor" | "tutor" };

export type FeedbackRow = {
  id: string;
  tutor_id: string;
  mentor_id: string;
  session_date: string;
  slot: string;
  session_link: string | null;
  overall_score: number;
  category_scores: Record<string, number>;
  uniform_status: string | null;
  positive_count: number;
  negative_count: number;
  notes: string | null;
  report_markdown: string | null;
  report_link: string | null;
  recommended_action: string | null;
  created_at: string;
};

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, tutor_code, status")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

export async function fetchRoles() {
  const { data, error } = await supabase.from("user_roles").select("user_id, role");
  if (error) throw error;
  return (data ?? []) as RoleRow[];
}

export async function fetchAssignments() {
  const { data, error } = await supabase
    .from("mentor_assignments")
    .select("id, mentor_id, tutor_id, team_leader_id, status, start_date, end_date");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFeedback() {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("session_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FeedbackRow[];
}

export async function fetchLibrary() {
  const { data, error } = await supabase
    .from("comment_library")
    .select("id, category, type, comment, score_impact, active")
    .order("category");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, tutor_id, session_date, slot, session_link, status")
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSettings(): Promise<{ weights: Weights; thresholds: Thresholds }> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;
  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    weights: { ...DEFAULT_WEIGHTS, ...((map.get("weights") as Weights) ?? {}) },
    thresholds: { ...DEFAULT_THRESHOLDS, ...((map.get("thresholds") as Thresholds) ?? {}) },
  };
}

export function nameOf(profiles: ProfileRow[], id: string | null | undefined) {
  if (!id) return "—";
  return profiles.find((p) => p.id === id)?.full_name || "Unknown";
}
