import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { fetchAssignments, fetchFeedback, fetchProfiles, fetchRoles } from "@/lib/data";
import { normalizeTutorCode } from "@/lib/tutorCode";
import { analyzeTutorFeedback, type TutorInsights } from "@/lib/insights.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI tutor insights — iSchool DEMI DECI Quality Dashboard" },
      { name: "description", content: "Find recurring strengths, improvement areas and discussion points from a tutor's feedback." },
      { property: "og:title", content: "AI tutor insights — iSchool DEMI DECI Quality Dashboard" },
      { property: "og:description", content: "Find recurring strengths, improvement areas and discussion points from a tutor's feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { user, isStaff } = useAuth();
  const analyze = useServerFn(analyzeTutorFeedback);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments });
  const feedback = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback });

  const [text, setText] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TutorInsights | null>(null);

  const tutors = useMemo(() => {
    const all = profiles.data ?? [];
    if (isStaff) {
      const ids = (rolesQ.data ?? []).filter((r) => r.role === "tutor").map((r) => r.user_id);
      return all.filter((p) => ids.includes(p.id));
    }
    const mine = (assignments.data ?? [])
      .filter((a) => a.mentor_id === user?.id && a.status === "active")
      .map((a) => a.tutor_id);
    return all.filter((p) => mine.includes(p.id));
  }, [profiles.data, rolesQ.data, assignments.data, isStaff, user?.id]);

  const labelOf = (t: { full_name: string; tutor_code: string | null }) =>
    t.tutor_code ? `${t.tutor_code} — ${t.full_name}` : t.full_name;

  const entries = useMemo(
    () => (feedback.data ?? []).filter((f) => f.tutor_id === tutorId).slice(0, 30),
    [feedback.data, tutorId],
  );

  function chooseTutor(v: string) {
    setText(v);
    const q = v.trim().toLowerCase();
    const code = normalizeTutorCode(v);
    const m = tutors.find(
      (t) => (code && t.tutor_code === code) || t.full_name.toLowerCase() === q || labelOf(t).toLowerCase() === q,
    );
    setTutorId(m?.id ?? "");
    setResult(null);
    const ids = (feedback.data ?? []).filter((f) => f.tutor_id === m?.id).slice(0, 10).map((f) => f.id);
    setPicked(ids);
  }

  async function run() {
    if (!tutorId || picked.length === 0) { toast.error("Choose a tutor and at least one feedback entry"); return; }
    setBusy(true);
    try {
      setResult(await analyze({ data: { tutorId, feedbackIds: picked } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="AI tutor insights">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">1. Choose tutor & entries</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tutor (type ID or name)</Label>
              <Input list="insight-tutors" placeholder="e.g. T-2232" value={text} onChange={(e) => chooseTutor(e.target.value)} />
              <datalist id="insight-tutors">
                {tutors.map((t) => <option key={t.id} value={labelOf(t)} />)}
              </datalist>
            </div>
            {tutorId ? (
              entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback for this tutor yet.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-auto">
                  {entries.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={picked.includes(f.id)}
                        onCheckedChange={() =>
                          setPicked((p) => (p.includes(f.id) ? p.filter((x) => x !== f.id) : [...p, f.id]))
                        }
                      />
                      <span>{f.session_date} · {f.slot} · {Math.round(f.overall_score)}%</span>
                    </label>
                  ))}
                </div>
              )
            ) : null}
            <Button className="w-full" onClick={run} disabled={busy || !tutorId || picked.length === 0}>
              {busy ? "Analyzing…" : `Analyze ${picked.length} entr${picked.length === 1 ? "y" : "ies"}`}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!result ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Results will appear here: recurring strengths, improvement areas, and talking points for your next check-in.
            </CardContent></Card>
          ) : (
            <>
              {result.summary ? <Card><CardContent className="pt-6 text-sm">{result.summary}</CardContent></Card> : null}
              <ThemeCard title="Recurring strengths" tone="text-success" items={result.strengths} />
              <ThemeCard title="Recurring improvement areas" tone="text-destructive" items={result.improvements} />
              <Card>
                <CardHeader><CardTitle className="text-base">Discussion points</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.discussion_points.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ThemeCard({ title, tone, items }: { title: string; tone: string; items: { theme: string; evidence: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className={`text-base ${tone}`}>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">None found.</p> : items.map((s, i) => (
          <div key={i}>
            <p className="text-sm font-medium">{s.theme}</p>
            <p className="text-xs text-muted-foreground">{s.evidence}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
