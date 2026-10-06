import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAssignments,
  fetchFeedback,
  fetchProfiles,
  fetchRoles,
  fetchSettings,
  nameOf,
} from "@/lib/data";
import { statusClass, tutorStats } from "@/lib/stats";
import { CATEGORIES } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — iSchool DEMI DECI Quality Dashboard" },
      { name: "description", content: "Quality overview of tutors, mentors and session feedback." },
      { property: "og:title", content: "Dashboard — iSchool DEMI DECI Quality Dashboard" },
      { property: "og:description", content: "Quality overview of tutors, mentors and sessions." },
    ],
  }),
  component: DashboardPage,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user, roles, isStaff, profile } = useAuth();
  const isMentor = roles.includes("mentor");

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments });
  const feedback = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const loading =
    profiles.isLoading || feedback.isLoading || settings.isLoading || assignments.isLoading;

  if (loading || !settings.data) {
    return (
      <AppShell title="Dashboard">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  const allProfiles = profiles.data ?? [];
  const allFeedback = feedback.data ?? [];
  const thresholds = settings.data.thresholds;
  const myAssignments = (assignments.data ?? []).filter(
    (a) => a.mentor_id === user?.id && a.status === "active",
  );

  const tutorIds = isStaff
    ? (rolesQ.data ?? []).filter((r) => r.role === "tutor").map((r) => r.user_id)
    : myAssignments.map((a) => a.tutor_id);

  const scopedFeedback = isStaff
    ? allFeedback
    : allFeedback.filter((f) => tutorIds.includes(f.tutor_id) || f.mentor_id === user?.id);

  const stats = tutorIds.map((id) => tutorStats(scopedFeedback, id, thresholds));
  const avgTeam = stats.filter((s) => s.sessions > 0);
  const teamAverage = avgTeam.length
    ? Math.round((avgTeam.reduce((s, t) => s + t.average, 0) / avgTeam.length) * 10) / 10
    : 0;

  // Tutor personal view
  if (!isMentor && !isStaff) {
    const mine = allFeedback.filter((f) => f.tutor_id === user?.id);
    const me = tutorStats(allFeedback, user?.id ?? "", thresholds);
    const categoryCount = new Map<string, number>();
    for (const row of mine) {
      for (const [key, value] of Object.entries(row.category_scores ?? {})) {
        categoryCount.set(key, (categoryCount.get(key) ?? 0) + Number(value));
      }
    }
    const best = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const worst = [...categoryCount.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    const label = (key?: string) => CATEGORIES.find((c) => c.key === key)?.label ?? "—";

    return (
      <AppShell title={`Welcome, ${profile?.full_name ?? ""}`}>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Overall score" value={`${me.average}%`} hint={me.status.label} />
          <Stat label="Reviewed sessions" value={me.sessions} />
          <Stat label="Positive feedback" value={me.positive} />
          <Stat label="Improvement points" value={me.negative} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Stat label="Strongest area" value={label(best)} />
          <Stat label="Focus area" value={label(worst)} />
        </div>
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Latest feedback</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to="/feedback">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {mine.slice(0, 5).map((row) => (
              <Link
                key={row.id}
                to="/feedback/$id"
                params={{ id: row.id }}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted"
              >
                <span>
                  {row.session_date} · {row.slot}
                </span>
                <Badge variant="secondary">{row.overall_score}%</Badge>
              </Link>
            ))}
            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const attention = stats.filter((s) => s.sessions > 0 && s.average < thresholds.attention);
  const mentorIds = (rolesQ.data ?? []).filter((r) => r.role === "mentor").map((r) => r.user_id);

  return (
    <AppShell title={isStaff ? "Team overview" : "Mentor dashboard"}>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label={isStaff ? "Total tutors" : "My tutors"} value={tutorIds.length} />
        <Stat label="Sessions reviewed" value={scopedFeedback.length} />
        <Stat label="Average score" value={`${teamAverage}%`} />
        <Stat
          label="Positive feedback"
          value={scopedFeedback.reduce((s, f) => s + f.positive_count, 0)}
        />
        <Stat
          label="Improvement notes"
          value={scopedFeedback.reduce((s, f) => s + f.negative_count, 0)}
        />
        <Stat label="Need attention" value={attention.length} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Tutor performance</CardTitle>
          <Button asChild size="sm">
            <Link to="/feedback/new">New feedback</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Tutor</th>
                <th>Sessions</th>
                <th>Average</th>
                <th>Positive</th>
                <th>Negative</th>
                <th>Last feedback</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats
                .sort((a, b) => b.average - a.average)
                .map((row) => (
                  <tr key={row.tutorId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{nameOf(allProfiles, row.tutorId)}</td>
                    <td>{row.sessions}</td>
                    <td>{row.average}%</td>
                    <td className="text-success">{row.positive}</td>
                    <td className="text-destructive">{row.negative}</td>
                    <td className="text-muted-foreground">{row.lastDate ?? "—"}</td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status.tone)}`}>
                        {row.status.label}
                      </span>
                    </td>
                  </tr>
                ))}
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No tutors assigned yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isStaff ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Mentor activity</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Mentor</th>
                  <th>Assigned tutors</th>
                  <th>Sessions reviewed</th>
                  <th>Average tutor score</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {mentorIds.map((mentorId) => {
                  const rows = allFeedback.filter((f) => f.mentor_id === mentorId);
                  const assigned = (assignments.data ?? []).filter(
                    (a) => a.mentor_id === mentorId && a.status === "active",
                  );
                  const avg = rows.length
                    ? Math.round(
                        (rows.reduce((s, r) => s + Number(r.overall_score), 0) / rows.length) * 10,
                      ) / 10
                    : 0;
                  const last = rows
                    .map((r) => r.session_date)
                    .sort()
                    .pop();
                  return (
                    <tr key={mentorId} className="border-b last:border-0">
                      <td className="py-2 font-medium">{nameOf(allProfiles, mentorId)}</td>
                      <td>{assigned.length}</td>
                      <td>{rows.length}</td>
                      <td>{avg}%</td>
                      <td className="text-muted-foreground">{last ?? "—"}</td>
                    </tr>
                  );
                })}
                {mentorIds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No mentors yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
