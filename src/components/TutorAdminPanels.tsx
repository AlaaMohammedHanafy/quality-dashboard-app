import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfiles, fetchRoles, nameOf } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", team_leader: "Team Leader", mentor: "Mentor", tutor: "Tutor" };

export function AccountsPanel() {
  const qc = useQueryClient();
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return (profiles.data ?? [])
      .filter((p) => [p.full_name, p.email].some((v) => v?.toLowerCase().includes(s)))
      .map((p) => ({ ...p, roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
  }, [profiles.data, roles.data, q]);

  async function toggleMentor(userId: string, isMentor: boolean) {
    setBusy(userId);
    const { error } = isMentor
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "mentor")
      : await supabase.from("user_roles").insert({ user_id: userId, role: "mentor" });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(isMentor ? "Mentor role removed" : "Now a mentor");
    await qc.invalidateQueries({ queryKey: ["roles"] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Accounts & mentors</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone who signed up appears here with their role. New accounts start as Tutor — click "Make mentor" to promote.
          </p>
        </div>
        <Input placeholder="Search accounts…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const isMentor = p.roles.includes("mentor");
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell>{p.email ?? "—"}</TableCell>
                  <TableCell className="space-x-1">
                    {p.roles.map((r) => <Badge key={r} variant={r === "mentor" ? "default" : "secondary"}>{ROLE_LABEL[r]}</Badge>)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={isMentor ? "outline" : "default"} disabled={busy === p.id}
                      onClick={() => void toggleMentor(p.id, isMentor)}>
                      {isMentor ? "Remove mentor" : "Make mentor"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function HistoryPanel() {
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const history = useQuery({
    queryKey: ["roster-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_assignment_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = history.data ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Assignment history</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No reassignments yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>When</TableHead><TableHead>Tutor</TableHead><TableHead>Previous mentor</TableHead><TableHead>New mentor</TableHead><TableHead>Changed by</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap">{new Date(h.changed_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{h.tutor_name}</TableCell>
                  <TableCell>{h.previous_mentor_name ?? h.previous_mentor_email ?? "—"}</TableCell>
                  <TableCell>{h.new_mentor_name ?? h.new_mentor_email ?? "—"}</TableCell>
                  <TableCell>{nameOf(profiles.data ?? [], h.changed_by)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
