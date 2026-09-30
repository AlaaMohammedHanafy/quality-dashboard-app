export type CategoryKey =
  | "attitude"
  | "project"
  | "teaching"
  | "interaction"
  | "homework"
  | "uniform";

export const CATEGORIES: { key: CategoryKey; label: string; library: string }[] = [
  { key: "attitude", label: "Attitude", library: "Attitude" },
  { key: "project", label: "Project / Implementation", library: "Project" },
  { key: "teaching", label: "Teaching / Preparation", library: "Teaching" },
  { key: "interaction", label: "Student Interaction", library: "Interaction" },
  { key: "homework", label: "Homework Checking", library: "Homework" },
  { key: "uniform", label: "Uniform / Dress Code", library: "Uniform" },
];

export const UNIFORM_OPTIONS = [
  { value: "compliant", label: "Compliant", score: 5 },
  { value: "minor", label: "Minor issue", score: 3 },
  { value: "not_compliant", label: "Not compliant", score: 1 },
];

export type Weights = Record<CategoryKey, number>;
export type Thresholds = { high: number; attention: number; negative_streak: number };

export const DEFAULT_WEIGHTS: Weights = {
  attitude: 20,
  project: 20,
  teaching: 20,
  interaction: 20,
  homework: 10,
  uniform: 10,
};

export const DEFAULT_THRESHOLDS: Thresholds = { high: 85, attention: 70, negative_streak: 3 };

export const SLOTS = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6"];

export type SelectedComment = {
  id: string;
  category: string;
  type: "positive" | "negative";
  comment: string;
  score_impact: number;
};

export function categoryScore(selected: SelectedComment[], libraryCategory: string): number | null {
  const items = selected.filter((c) => c.category === libraryCategory);
  if (items.length === 0) return null;
  let score = 3;
  for (const item of items) {
    score += item.type === "positive" ? item.score_impact : -item.score_impact;
  }
  return Math.max(0, Math.min(5, score));
}

export function computeScores(
  selected: SelectedComment[],
  uniform: string | null,
  weights: Weights,
) {
  const scores: Partial<Record<CategoryKey, number>> = {};
  for (const cat of CATEGORIES) {
    if (cat.key === "uniform") {
      const option = UNIFORM_OPTIONS.find((o) => o.value === uniform);
      if (option) scores.uniform = option.score;
      continue;
    }
    const value = categoryScore(selected, cat.library);
    if (value !== null) scores[cat.key] = value;
  }

  let weighted = 0;
  let totalWeight = 0;
  for (const cat of CATEGORIES) {
    const value = scores[cat.key];
    if (value === undefined) continue;
    const weight = weights[cat.key] ?? 0;
    weighted += (value / 5) * 100 * weight;
    totalWeight += weight;
  }
  const overall = totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
  return { scores, overall };
}

export function performanceStatus(score: number, thresholds: Thresholds) {
  if (score >= thresholds.high) return { label: "High performing", tone: "good" as const };
  if (score >= thresholds.attention) return { label: "Needs attention", tone: "warn" as const };
  return { label: "Needs improvement", tone: "bad" as const };
}

export function recommendedActions(selected: SelectedComment[]): string[] {
  const negativeByCategory = new Set(
    selected.filter((c) => c.type === "negative").map((c) => c.category),
  );
  if (negativeByCategory.size === 0) return ["Continue current practice."];
  const map: Record<string, string> = {
    Attitude: "Improve communication and classroom atmosphere.",
    Project: "Strengthen technical guidance on project implementation.",
    Teaching: "Improve session preparation and structure.",
    Interaction: "Focus on student engagement.",
    Homework: "Improve homework checking and follow-up.",
  };
  return [...negativeByCategory].map((cat) => map[cat] ?? `Improve ${cat}.`);
}

export function buildReport(input: {
  tutorName: string;
  mentorName: string;
  sessionDate: string;
  slot: string;
  selected: SelectedComment[];
  scores: Partial<Record<CategoryKey, number>>;
  overall: number;
  uniform: string | null;
  notes?: string;
}): string {
  const positives = input.selected.filter((c) => c.type === "positive");
  const negatives = input.selected.filter((c) => c.type === "negative");
  const uniformLabel =
    UNIFORM_OPTIONS.find((o) => o.value === input.uniform)?.label ?? "Not evaluated";

  const breakdown = CATEGORIES.filter((c) => c.key !== "uniform")
    .map((c) => {
      const value = input.scores[c.key];
      return value === undefined ? null : `- ${c.label}: ${value}/5`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    `# Session Feedback Report`,
    ``,
    `**Tutor:** ${input.tutorName}`,
    `**Mentor:** ${input.mentorName}`,
    `**Date:** ${input.sessionDate}`,
    `**Session:** ${input.slot}`,
    ``,
    `## Strengths`,
    positives.length ? positives.map((c) => `- ${c.comment}`).join("\n") : "- None recorded",
    ``,
    `## Areas for Improvement`,
    negatives.length ? negatives.map((c) => `- ${c.comment}`).join("\n") : "- None recorded",
    ``,
    `## Category Breakdown`,
    breakdown || "- Not evaluated",
    `- Dress Code: ${uniformLabel}`,
    ``,
    `## Overall Score`,
    `${input.overall}%`,
    ``,
    `## Recommended Action`,
    recommendedActions(input.selected)
      .map((a) => `- ${a}`)
      .join("\n"),
    input.notes ? `\n## Mentor Notes\n${input.notes}` : "",
  ].join("\n");
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
