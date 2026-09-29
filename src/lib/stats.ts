import type { FeedbackRow } from "@/lib/data";
import { performanceStatus, type Thresholds } from "@/lib/quality";

export type TutorStats = {
  tutorId: string;
  sessions: number;
  average: number;
  positive: number;
  negative: number;
  lastDate: string | null;
  trend: number;
  status: ReturnType<typeof performanceStatus>;
};

export function tutorStats(
  feedback: FeedbackRow[],
  tutorId: string,
  thresholds: Thresholds,
): TutorStats {
  const rows = feedback
    .filter((f) => f.tutor_id === tutorId)
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const sessions = rows.length;
  const average = sessions
    ? Math.round((rows.reduce((sum, r) => sum + Number(r.overall_score), 0) / sessions) * 10) / 10
    : 0;
  const positive = rows.reduce((s, r) => s + r.positive_count, 0);
  const negative = rows.reduce((s, r) => s + r.negative_count, 0);
  const last = rows[rows.length - 1] ?? null;
  const recent = rows.slice(-3);
  const earlier = rows.slice(-6, -3);
  const avg = (list: FeedbackRow[]) =>
    list.length ? list.reduce((s, r) => s + Number(r.overall_score), 0) / list.length : 0;
  const trend = recent.length && earlier.length ? Math.round((avg(recent) - avg(earlier)) * 10) / 10 : 0;

  return {
    tutorId,
    sessions,
    average,
    positive,
    negative,
    lastDate: last?.session_date ?? null,
    trend,
    status: performanceStatus(average, thresholds),
  };
}

export function negativeStreak(feedback: FeedbackRow[], tutorId: string) {
  const rows = feedback
    .filter((f) => f.tutor_id === tutorId)
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
  let streak = 0;
  for (const row of rows) {
    if (row.negative_count > 0) streak += 1;
    else break;
  }
  return streak;
}

export function statusClass(tone: "good" | "warn" | "bad") {
  if (tone === "good") return "bg-success/15 text-success";
  if (tone === "warn") return "bg-warning/20 text-warning";
  return "bg-destructive/15 text-destructive";
}
