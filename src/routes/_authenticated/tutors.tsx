import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { normalizeTutorCode } from "@/lib/tutorCode";
import { TutorFormDialog } from "@/components/TutorFormDialog";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AccountsPanel, HistoryPanel } from "@/components/TutorAdminPanels";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfiles, fetchRoles } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/tutors")({
  head: () => ({
    meta: [
      { title: "My Tutors — Quality Dashboard" },
      { name: "description", content: "View your assigned tutors and import tutor lists from a spreadsheet." },
      { property: "og:title", content: "My Tutors — Quality Dashboard" },
      { property: "og:description", content: "View your assigned tutors and import tutor lists from a spreadsheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorsPage,
});

type RosterRow = {
  id: string;
  tutor_code: string | null;
  full_name: string;
  email: string | null;
  mentor_name: string | null;
  mentor_email: string | null;
  created_by: string | null;
};

const HEADER_MAP: Record<string, keyof Omit<RosterRow, "id" | "created_by">> = {
  "tutor id": "tutor_code", "tutor code": "tutor_code", id: "tutor_code", code: "tutor_code",
  "tutor name": "full_name", name: "full_name", "full name": "full_name", tutor: "full_name",
  "tutor email": "email", email: "email",
  mentor: "mentor_name", "mentor name": "mentor_name", "assigned mentor": "mentor_name",
  "mentor email": "mentor_email",
};

async function fetchRoster() {
  const { data, error } = await supabase
    .from("tutor_roster")
    .select("id, tutor_code, full_name, email, mentor_name, mentor_email, created_by")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as RosterRow[];
}

function keyOf(r: { tutor_code: string | null; email: string | null; full_name: string; mentor_email: string | null }) {
  return `${(r.tutor_code || r.email || r.full_name).toLowerCase()}|${(r.mentor_email ?? "").toLowerCase()}`;
}

function TutorsPage() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const roster = useQuery({ queryKey: ["roster"], queryFn: fetchRoster });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles, enabled: isStaff });
  const mentors = useMemo(() => {
    const ids = new Set((roles.data ?? []).filter((r) => r.role === "mentor").map((r) => r.user_id));
    return (profiles.data ?? []).filter((p) => ids.has(p.id) && p.email);
  }, [roles.data, profiles.data]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (roster.data ?? []).filter((r) =>
      [r.full_name, r.tutor_code, r.email, r.mentor_name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [roster.data, search]);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const sheetName = wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("The file has no sheets");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const people = profiles.data ?? [];
      const existing = new Set((roster.data ?? []).map(keyOf));
      const badCodes: string[] = [];
      const parsed = raw
        .map((row) => {
          const out: Partial<Record<"tutor_code" | "full_name" | "email" | "mentor_name" | "mentor_email", string>> = {};
          for (const [h, v] of Object.entries(row)) {
            const field = HEADER_MAP[h.trim().toLowerCase()];
            if (field && String(v).trim()) out[field] = String(v).trim();
          }
          if (!out.mentor_email && out.mentor_name) {
            const match = people.find((p) => p.full_name.toLowerCase() === out.mentor_name!.toLowerCase());
            if (match?.email) out.mentor_email = match.email;
          }
          const code = normalizeTutorCode(out.tutor_code);
          if (code === null) badCodes.push(out.tutor_code!);
          return {
            tutor_code: code ?? null,
            full_name: out.full_name ?? "",
            email: out.email ?? null,
            mentor_name: out.mentor_name ?? null,
            mentor_email: out.mentor_email?.toLowerCase() ?? null,
            created_by: user!.id,
          };
        })
        .filter((r) => r.full_name);
      if (badCodes.length > 0)
        throw new Error(`Invalid Tutor ID(s): ${badCodes.slice(0, 5).join(", ")}. Use the format T-2232.`);
      const seen = new Set<string>();
      const fresh = parsed.filter((r) => {
        const k = keyOf(r);
        if (existing.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (parsed.length === 0) throw new Error("No tutor rows found. Include a 'Tutor Name' column.");
      if (fresh.length > 0) {
        const { error } = await supabase.from("tutor_roster").insert(fresh);
        if (error) throw error;
      }
      toast.success(`Imported ${fresh.length} tutors (${parsed.length - fresh.length} already listed)`);
      await qc.invalidateQueries({ queryKey: ["roster"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function reassign(id: string, mentorId: string) {
    const m = mentors.find((x) => x.id === mentorId);
    if (!m) return;
    const { error } = await supabase
      .from("tutor_roster")
      .update({ mentor_name: m.full_name, mentor_email: m.email!.toLowerCase() })
      .eq("id", id);
    if (error) return void toast.error(error.code === "23505" ? "This tutor is already assigned to that mentor" : error.message);
    toast.success(`Reassigned to ${m.full_name}`);
    await qc.invalidateQueries({ queryKey: ["roster"] });
    await qc.invalidateQueries({ queryKey: ["roster-history"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("tutor_roster").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["roster"] });
  }

  function template() {
    downloadCsv("tutors-template.csv", [
      { "Tutor ID": "T-2232", "Tutor Name": "Sara Ahmed", "Tutor Email": "sara@example.com", "Mentor Name": "Omar Ali", "Mentor Email": "omar@example.com" },
    ]);
  }

  return (
    <AppShell title="My Tutors">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Import tutors</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Upload a CSV or Excel file with columns <b>Tutor ID</b>, <b>Tutor Name</b>, <b>Tutor Email</b>,{" "}
              <b>Mentor Name</b> and <b>Mentor Email</b>. Each mentor only sees the tutors assigned to their email
              {isStaff ? "; admins and team leaders see everyone." : "."}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="mr-1 size-4" />{busy ? "Importing…" : "Import spreadsheet"}
              </Button>
              <Button variant="outline" onClick={template}><Download className="mr-1 size-4" />Download template</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Tutors ({rows.length})</CardTitle>
            <div className="flex items-center gap-2">
            <TutorFormDialog
              userId={user?.id ?? ""}
              onSaved={() => qc.invalidateQueries({ queryKey: ["roster"] })}
              trigger={<Button size="sm"><Plus className="mr-1 size-4" />Add tutor</Button>}
            />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            </div>
          </CardHeader>
          <CardContent>
            {roster.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground">No tutors yet. Import a spreadsheet to add them.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead>
                    <TableHead>Mentor</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.tutor_code ?? "—"}</TableCell>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{r.email ?? "—"}</TableCell>
                      <TableCell>
                        {isStaff ? (
                          <Select
                            value={mentors.find((m) => m.email!.toLowerCase() === r.mentor_email)?.id ?? ""}
                            onValueChange={(v) => void reassign(r.id, v)}
                          >
                            <SelectTrigger className="h-8 w-48" aria-label={`Mentor for ${r.full_name}`}>
                              <SelectValue placeholder={r.mentor_name ?? r.mentor_email ?? "Assign mentor"} />
                            </SelectTrigger>
                            <SelectContent>
                              {mentors.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">No mentor accounts yet</div>
                              ) : mentors.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (r.mentor_name ?? r.mentor_email ?? "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        {(isStaff || r.created_by === user?.id) && (
                          <TutorFormDialog
                            initial={r}
                            userId={user?.id ?? ""}
                            onSaved={() => qc.invalidateQueries({ queryKey: ["roster"] })}
                            trigger={<Button variant="ghost" size="icon" aria-label={`Edit ${r.full_name}`}><Pencil className="size-4" /></Button>}
                          />
                        )}
                        {(isStaff || r.created_by === user?.id) && (
                          <Button variant="ghost" size="icon" onClick={() => void remove(r.id)} aria-label="Remove tutor">
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {isStaff && <AccountsPanel />}
        {isStaff && <HistoryPanel />}
      </div>
    </AppShell>
  );
}
