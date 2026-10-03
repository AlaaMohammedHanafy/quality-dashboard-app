import { supabase } from "@/integrations/supabase/client";
import type { FeedbackRow } from "@/lib/data";

export type StreakAlert = {
  tutorId: string;
  category: string;
  streak: number;
  lastDate: string;
  lastFeedbackId: string;
};

export async function fetchNegativeComments() {
  const { data, error } = await supabase
    .from("feedback_comments")
    .select("feedback_id, category")
    .eq("type", "negative");
  if (error) throw error;
  return data ?? [];
}

/** Consecutive most-recent sessions per tutor with improvement feedback in the same category. */
export function computeStreakAlerts(
  feedback: FeedbackRow[],
  negatives: { feedback_id: string; category: string }[],
  threshold: number,
): StreakAlert[] {
  const negByFeedback = new Map<string, Set<string>>();
  for (const n of negatives) {
    const set = negByFeedback.get(n.feedback_id) ?? new Set<string>();
    set.add(n.category);
    negByFeedback.set(n.feedback_id, set);
  }
  const byTutor = new Map<string, FeedbackRow[]>();
  for (const f of feedback) {
    const list = byTutor.get(f.tutor_id) ?? [];
    list.push(f);
    byTutor.set(f.tutor_id, list);
  }
  const alerts: StreakAlert[] = [];
  const limit = Math.max(1, threshold);
  for (const [tutorId, rows] of byTutor) {
    rows.sort((a, b) =>
      b.session_date === a.session_date
        ? b.created_at.localeCompare(a.created_at)
        : b.session_date.localeCompare(a.session_date),
    );
    const latest = rows[0];
    if (!latest) continue;
    for (const category of negByFeedback.get(latest.id) ?? []) {
      let streak = 0;
      for (const row of rows) {
        if (negByFeedback.get(row.id)?.has(category)) streak += 1;
        else break;
      }
      if (streak >= limit) {
        alerts.push({
          tutorId,
          category,
          streak,
          lastDate: latest.session_date,
          lastFeedbackId: latest.id,
        });
      }
    }
  }
  return alerts.sort((a, b) => b.streak - a.streak);
}
