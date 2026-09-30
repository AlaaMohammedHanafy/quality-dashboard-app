import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAssignments,
  fetchLibrary,
  fetchProfiles,
  fetchRoles,
  fetchSettings,
  nameOf,
} from "@/lib/data";
import {
  buildReport,
  CATEGORIES,
  computeScores,
  recommendedActions,
  SLOTS,
  UNIFORM_OPTIONS,
  type SelectedComment,
} from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/feedback/new")({
  head: () => ({
    meta: [
      { title: "New session feedback — Quality Dashboard" },
      { name: "description", content: "Submit standardized feedback for a tutor session." },
      { property: "og:title", content: "New session feedback — Quality Dashboard" },
      { property: "og:description", content: "Submit standardized feedback for a tutor session." },
    ],
  }),
  component: NewFeedbackPage,
});

function NewFeedbackPage() {
  const { user, profile, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments });
  const library = useQuery({ queryKey: ["library"], queryFn: fetchLibrary });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [tutorId, setTutorId] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<string>(SLOTS[0] ?? "Slot 1");
  const [sessionLink, setSessionLink] = useState("");
  const [uniform, setUniform] = useState<string>("compliant");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const tutorOptions = useMemo(() => {
    const all = profiles.data ?? [];
    if (isStaff) {
      const tutorIds = (rolesQ.data ?? []).filter((r) => r.role === "tutor").map((r) => r.user_id);
      return all.filter((p) => tutorIds.includes(p.id));
    }
    const mine = (assignments.data ?? [])
      .filter((a) => a.mentor_id === user?.id && a.status === "active")
      .map((a) => a.tutor_id);
    return all.filter((p) => mine.includes(p.id));
  }, [profiles.data, rolesQ.data, assignments.data, isStaff, user?.id]);

  const selected: SelectedComment[] = useMemo(
    () =>
      (library.data ?? [])
        .filter((c) => selectedIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          category: c.category,
          type: c.type as "positive" | "negative",
          comment: c.comment,
          score_impact: c.score_impact,
        })),
    [library.data, selectedIds],
  );

  const weights = settings.data?.weights;
  const { scores, overall } = useMemo(
    () => (weights ? computeScores(selected, uniform, weights) : { scores: {}, overall: 0 }),
    [selected, uniform, weights],
  );

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!tutorId) { toast.error("Select a tutor first"); return; }
    if (selected.length === 0) { toast.error("Select at least one feedback item"); return; }
    setBusy(true);
    try {
      const { data: sessionRow } = await supabase
        .from("sessions")
        .upsert(
          {
            tutor_id: tutorId,
            session_date: date,
            slot,
            session_link: sessionLink || null,
            status: "reviewed",
            created_by: user?.id,
          },
          { onConflict: "tutor_id,session_date,slot" },
        )
        .select("id")
        .maybeSingle();

      const report = buildReport({
        tutorName: nameOf(profiles.data ?? [], tutorId),
        mentorName: profile?.full_name ?? "Mentor",
        sessionDate: date,
        slot,
        selected,
        scores,
        overall,
        uniform,
        notes,
      });

      const { data: inserted, error } = await supabase
        .from("feedback")
        .insert({
          session_id: sessionRow?.id ?? null,
          tutor_id: tutorId,
          mentor_id: user!.id,
          session_date: date,
          slot,
          session_link: sessionLink || null,
          category_scores: scores,
          overall_score: overall,
          uniform_status: uniform,
          positive_count: selected.filter((c) => c.type === "positive").length,
          negative_count: selected.filter((c) => c.type === "negative").length,
          notes: notes || null,
          report_markdown: report,
          recommended_action: recommendedActions(selected).join(" "),
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("feedback_comments").insert(
        selected.map((c) => ({
          feedback_id: inserted.id,
          library_comment_id: c.id,
          category: c.category,
          type: c.type,
          comment_text: c.comment,
          score_impact: c.score_impact,
        })),
      );

      await supabase
        .from("feedback")
        .update({ report_link: `${window.location.origin}/feedback/${inserted.id}` })
        .eq("id", inserted.id);

      await queryClient.invalidateQueries();
      toast.success("Feedback submitted and report generated");
      navigate({ to: "/feedback/$id", params: { id: inserted.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="New session feedback">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tutor</Label>
                <Select value={tutorId} onValueChange={setTutorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutorOptions.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id}>
                        {tutor.full_name}
                        {tutor.tutor_code ? ` (${tutor.tutor_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tutorOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No tutors assigned to you yet. An admin can assign tutors in Settings.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Session slot</Label>
                <Select value={slot} onValueChange={setSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session link (optional)</Label>
                <Input
                  placeholder="https://…"
                  value={sessionLink}
                  onChange={(e) => setSessionLink(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {CATEGORIES.filter((c) => c.key !== "uniform").map((category) => {
            const items = (library.data ?? []).filter(
              (c) => c.category === category.library && c.active,
            );
            return (
              <Card key={category.key}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">{category.label}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {scores[category.key] !== undefined ? `${scores[category.key]}/5` : "—"}
                  </span>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  {(["positive", "negative"] as const).map((type) => (
                    <div key={type}>
                      <p
                        className={`mb-2 text-xs font-semibold uppercase ${
                          type === "positive" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {type === "positive" ? "Strengths" : "Improvement"}
                      </p>
                      <div className="space-y-2">
                        {items
                          .filter((c) => c.type === type)
                          .map((item) => (
                            <label key={item.id} className="flex items-start gap-2 text-sm">
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={() => toggle(item.id)}
                              />
                              <span>{item.comment}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uniform / dress code</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Select value={uniform} onValueChange={setUniform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optional notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                placeholder="Anything else worth recording…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-4xl font-extrabold text-primary">{overall}%</p>
              <div className="space-y-1 text-sm">
                {CATEGORIES.map((category) => (
                  <div key={category.key} className="flex justify-between">
                    <span className="text-muted-foreground">{category.label}</span>
                    <span>
                      {scores[category.key] !== undefined ? `${scores[category.key]}/5` : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-success">
                  +{selected.filter((c) => c.type === "positive").length} strengths
                </span>
                <span className="text-destructive">
                  −{selected.filter((c) => c.type === "negative").length} improvements
                </span>
              </div>
              <Button className="w-full" onClick={submit} disabled={busy}>
                Submit feedback
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
