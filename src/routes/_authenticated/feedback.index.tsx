import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { fetchFeedback, fetchProfiles, fetchSettings, nameOf } from "@/lib/data";
import { CATEGORIES, downloadCsv, SLOTS } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/feedback/")({
  head: () => ({
    meta: [
      { title: "Feedback records — iSchool DEMI DECI Quality Dashboard" },
      { name: "description", content: "Filter, review and export session feedback records." },
      { property: "og:title", content: "Feedback records — iSchool DEMI DECI Quality Dashboard" },
      { property: "og:description", content: "Filter, review and export session feedback." },
    ],
  }),
  component: FeedbackListPage,
});

const ALL = "all";

function FeedbackListPage() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const feedback = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback });
  useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [tutor, setTutor] = useState(ALL);
  const [mentor, setMentor] = useState(ALL);
  const [slot, setSlot] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [type, setType] = useState(ALL);

  const rows = feedback.data ?? [];
  const people = profiles.data ?? [];

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (tutor !== ALL && row.tutor_id !== tutor) return false;
        if (mentor !== ALL && row.mentor_id !== mentor) return false;
        if (slot !== ALL && row.slot !== slot) return false;
        if (from && row.session_date < from) return false;
        if (to && row.session_date > to) return false;
        if (minScore && Number(row.overall_score) < Number(minScore)) return false;
        if (maxScore && Number(row.overall_score) > Number(maxScore)) return false;
        if (type === "positive" && row.positive_count === 0) return false;
        if (type === "negative" && row.negative_count === 0) return false;
        return true;
      }),
    [rows, tutor, mentor, slot, from, to, minScore, maxScore, type],
  );

  function exportCsv() {
    downloadCsv(
      `quality-feedback-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        "Tutor ID": row.tutor_id,
        "Tutor Name": nameOf(people, row.tutor_id),
        "Mentor Name": nameOf(people, row.mentor_id),
        "Session Date": row.session_date,
        "Session Slot": row.slot,
        Score: row.overall_score,
        "Positive Count": row.positive_count,
        "Negative Count": row.negative_count,
        ...Object.fromEntries(
          CATEGORIES.map((c) => [c.label, row.category_scores?.[c.key] ?? ""]),
        ),
        "Recommended Action": row.recommended_action ?? "",
        "Report Link": row.report_link ?? "",
        "Feedback Submitted Date": row.created_at.slice(0, 10),
      })),
    );
  }

  return (
    <AppShell title="Feedback records">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" /> Export ({filtered.length})
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Tutor</Label>
            <Select value={tutor} onValueChange={setTutor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All tutors</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mentor</Label>
            <Select value={mentor} onValueChange={setMentor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All mentors</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slot</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All slots</SelectItem>
                {SLOTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feedback type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="positive">Has positive</SelectItem>
                <SelectItem value="negative">Has improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min score</Label>
            <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max score</Label>
            <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Date</th>
                <th>Slot</th>
                <th>Tutor</th>
                <th>Mentor</th>
                <th>Score</th>
                <th>Positive</th>
                <th>Improvement</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2">{row.session_date}</td>
                  <td>{row.slot}</td>
                  <td className="font-medium">{nameOf(people, row.tutor_id)}</td>
                  <td>{nameOf(people, row.mentor_id)}</td>
                  <td>{row.overall_score}%</td>
                  <td className="text-success">{row.positive_count}</td>
                  <td className="text-destructive">{row.negative_count}</td>
                  <td>
                    <Link
                      to="/feedback/$id"
                      params={{ id: row.id }}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No feedback matches these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
