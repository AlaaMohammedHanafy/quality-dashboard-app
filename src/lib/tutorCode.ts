export const TUTOR_CODE_PATTERN = /^T-\d{3,}$/;

/** Tutor IDs look like T-2232. Accepts "t2232", "T 2232", "2232"; returns null if invalid, undefined if empty. */
export function normalizeTutorCode(raw: string | undefined | null): string | null | undefined {
  if (!raw || !raw.trim()) return undefined;
  const m = raw.trim().match(/^(?:t\s*-?\s*)?(\d{3,})$/i);
  return m ? `T-${m[1]}` : null;
}
