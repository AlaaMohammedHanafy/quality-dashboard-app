import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTutorCode } from "@/lib/tutorCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Initial = { id: string; tutor_code: string | null; full_name: string; email: string | null };

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email").max(255)]),
});

export function TutorFormDialog({
  trigger,
  initial,
  userId,
  onSaved,
}: {
  trigger: ReactNode;
  initial?: Initial;
  userId: string;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(initial?.tutor_code ?? "");
    setName(initial?.full_name ?? "");
    setEmail(initial?.email ?? "");
    setCodeError(null);
  }, [open, initial]);

  async function save() {
    const normalized = normalizeTutorCode(code);
    if (normalized === null) return setCodeError("Use the format T-2232 (T- followed by digits).");
    const parsed = schema.safeParse({ full_name: name, email });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    setSaving(true);
    const values = {
      tutor_code: normalized ?? null,
      full_name: parsed.data.full_name,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
    };
    const { error } = initial
      ? await supabase.from("tutor_roster").update(values).eq("id", initial.id)
      : await supabase.from("tutor_roster").insert({ ...values, created_by: userId });
    setSaving(false);
    if (error) {
      if (error.code === "23514") return setCodeError("Use the format T-2232 (T- followed by digits).");
      return void toast.error(error.code === "23505" ? "This tutor is already listed" : error.message);
    }
    toast.success(initial ? "Tutor updated" : "Tutor added");
    setOpen(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit tutor" : "Add tutor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="tutor-code">Tutor ID</Label>
            <Input
              id="tutor-code"
              placeholder="T-2232"
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
              onBlur={() => { const n = normalizeTutorCode(code); if (n) setCode(n); }}
              aria-invalid={!!codeError}
            />
            {codeError ? <p className="text-xs text-destructive">{codeError}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tutor-name">Name</Label>
            <Input id="tutor-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tutor-email">Email</Label>
            <Input id="tutor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
