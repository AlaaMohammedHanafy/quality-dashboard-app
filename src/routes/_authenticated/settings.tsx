import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings } from "@/lib/data";
import { CATEGORIES, type Thresholds, type Weights } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Quality Dashboard" },
      { name: "description", content: "Configure scoring weights for feedback categories." },
      { property: "og:title", content: "Settings — Quality Dashboard" },
      { property: "og:description", content: "Configure scoring weights for feedback categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [weights, setWeights] = useState<Weights | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds | null>(null);
  useEffect(() => { if (settings.data && !weights) setWeights(settings.data.weights); }, [settings.data, weights]);
  useEffect(() => { if (settings.data && !thresholds) setThresholds(settings.data.thresholds); }, [settings.data, thresholds]);

  async function saveThresholds() {
    if (!thresholds) return;
    const { error } = await supabase.from("app_settings").upsert({ key: "thresholds", value: thresholds });
    if (error) return void toast.error(error.message);
    toast.success("Alert settings saved");
    await qc.invalidateQueries({ queryKey: ["settings"] });
  }

  async function save() {
    if (!weights) return;
    const { error } = await supabase.from("app_settings").upsert({ key: "weights", value: weights });
    if (error) return void toast.error(error.message);
    toast.success("Weights saved");
    await qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <AppShell title="Settings">
      <Card className="max-w-xl">
        <CardHeader><CardTitle>Category weights (%)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {weights && CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <Label>{c.label}</Label>
              <Input type="number" className="w-24" value={weights[c.key]}
                onChange={(e) => setWeights({ ...weights, [c.key]: Number(e.target.value) })} />
            </div>
          ))}
          <Button onClick={() => void save()}>Save</Button>
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-xl">
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {thresholds && (
            <div className="flex items-center justify-between gap-4">
              <Label>Sessions in a row with improvement feedback in the same category</Label>
              <Input type="number" min={1} className="w-24" value={thresholds.negative_streak}
                onChange={(e) => setThresholds({ ...thresholds, negative_streak: Math.max(1, Number(e.target.value)) })} />
            </div>
          )}
          <Button onClick={() => void saveThresholds()}>Save</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
