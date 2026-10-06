import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { fetchProfiles, fetchSessions, nameOf } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions — iSchool DEMI DECI Quality Dashboard" },
      { name: "description", content: "All tutoring sessions and their review status." },
      { property: "og:title", content: "Sessions — iSchool DEMI DECI Quality Dashboard" },
      { property: "og:description", content: "All tutoring sessions and their review status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const rows = sessions.data ?? [];
  return (
    <AppShell title="Sessions">
      <Card>
        <CardContent className="pt-6">
          {sessions.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No sessions yet. They appear when feedback is submitted.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Slot</TableHead><TableHead>Tutor</TableHead><TableHead>Status</TableHead><TableHead>Link</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.session_date}</TableCell>
                    <TableCell>{s.slot}</TableCell>
                    <TableCell>{nameOf(profiles.data ?? [], s.tutor_id)}</TableCell>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell>{s.session_link ? <a className="text-primary underline" href={s.session_link} target="_blank" rel="noreferrer">Open</a> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
