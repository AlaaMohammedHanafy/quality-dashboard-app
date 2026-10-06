import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfiles, fetchRoles } from "@/lib/data";
import { normalizeTutorCode } from "@/lib/tutorCode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({
    meta: [
      { title: "Assign Tutors — iSchool DEMI DECI Quality Dashboard" },
      { name: "description", content: "Assign tutors to mentors by Tutor ID." },
      { property: "og:title", content: "Assign Tutors — iSchool DEMI DECI Quality Dashboard" },
      { property: "og:description", content: "Assign tutors to mentors by Tutor ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

type Row = { id: string; tutor_code: string | null; full_name: string; mentor_name: string | null; mentor_email: string | null };

async function fetchRoster() {
  const { data, error } = await supabase
    .from("tutor_roster")
    .select("id, tutor_code, full_name, mentor_name, mentor_email")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Row[];
}

function AssignmentsPage() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const roster = useQuery({ queryKey: ["roster"], queryFn: fetchRoster, enabled: isStaff });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, enabled: isStaff });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles, enabled: isStaff });
  const mentors = useMemo(() => {
    const ids = new Set((roles.data ?? []).filter((r) => r.role === "mentor").map((r) => r.user_id));
    return (profiles.data ?? []).filter((p) => ids.has(p.id) && p.email);
  }, [roles.data, profiles.data]);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const normalized = normalizeTutorCode(code);
  const existing = normalized ? (roster.data ?? []).find((r) => r.tutor_code === normalized) : undefined;

  function checkCode() {
    if (!code.trim()) return setCodeError("Tutor ID is required");
    const n = normalizeTutorCode(code);
    if (!n) return setCodeError("Use the format T-2232");
    setCode(n);
    setCodeError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = normalizeTutorCode(code);
    if (!n) return setCodeError(code.trim() ? "Use the format T-2232" : "Tutor ID is required");
    const m = mentors.find((x) => x.id === mentorId);
    if (!m) return toast.error("Choose a mentor");
    if (!existing && !name.trim()) return toast.error("Enter the tutor's name — this ID isn't in the list yet");
    setBusy(true);
    const payload = { mentor_name: m.full_name, mentor_email: m.email!.toLowerCase() };
    const { error } = existing
      ? await supabase.from("tutor_roster").update(payload).eq("id", existing.id)
      : await supabase.from("tutor_roster").insert({ ...payload, tutor_code: n, full_name: name.trim(), created_by: user!.id });
    setBusy(false);
    if (error) {
      if (error.code === "23505") return void toast.error("This tutor is already assigned to that mentor");
      if (error.code === "23514") return void setCodeError("Use the format T-2232");
      return void toast.error(error.message);
    }
    toast.success(`${n} assigned to ${m.full_name}`);
    setCode(""); setName(""); setMentorId("");
    await qc.invalidateQueries({ queryKey: ["roster"] });
    await qc.invalidateQueries({ queryKey: ["roster-history"] });
  }

  async function reassign(id: string, mId: string) {
    const m = mentors.find((x) => x.id === mId);
    if (!m) return;
    const { error } = await supabase.from("tutor_roster")
      .update({ mentor_name: m.full_name, mentor_email: m.email!.toLowerCase() }).eq("id", id);
    if (error) return void toast.error(error.code === "23505" ? "This tutor is already assigned to that mentor" : error.message);
    toast.success(`Reassigned to ${m.full_name}`);
    await qc.invalidateQueries({ queryKey: ["roster"] });
    await qc.invalidateQueries({ queryKey: ["roster-history"] });
  }

  const rows = (roster.data ?? []).filter((r) =>
    [r.full_name, r.tutor_code, r.mentor_name].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  if (!isStaff) {
    return <AppShell title="Assign Tutors"><p className="text-muted-foreground">Only admins and team leaders can assign tutors.</p></AppShell>;
  }

  return (
    <AppShell title="Assign Tutors">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>New assignment</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-4 md:items-end">
              <div className="space-y-1">
                <Label htmlFor="code">Tutor ID</Label>
                <Input id="code" placeholder="T-2232" value={code} onChange={(e) => { setCode(e.target.value); setCodeError(""); }} onBlur={checkCode} />
                {codeError ? <p className="text-xs text-destructive">{codeError}</p>
                  : existing ? <p className="text-xs text-muted-foreground">{existing.full_name} · now with {existing.mentor_name ?? "no mentor"}</p> : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Tutor name</Label>
                <Input id="name" placeholder={existing ? existing.full_name : "Needed for new tutors"} value={existing ? existing.full_name : name} disabled={!!existing} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Mentor</Label>
                <Select value={mentorId} onValueChange={setMentorId}>
                  <SelectTrigger><SelectValue placeholder="Choose a mentor" /></SelectTrigger>
                  <SelectContent>
                    {mentors.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No mentors yet</div>
                      : mentors.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={busy}>{existing ? "Reassign" : "Assign"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle>Current assignments</CardTitle>
            <Input className="max-w-xs" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Tutor ID</TableHead><TableHead>Tutor</TableHead><TableHead>Mentor</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No tutors yet</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.tutor_code ?? "—"}</TableCell>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => void reassign(r.id, v)}>
                        <SelectTrigger className="h-8 w-56" aria-label={`Mentor for ${r.full_name}`}>
                          <SelectValue placeholder={r.mentor_name ?? r.mentor_email ?? "Assign mentor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {mentors.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
