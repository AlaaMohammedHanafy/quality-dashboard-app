import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { fetchFeedback } from "@/lib/data";
import { CATEGORIES } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Quality Dashboard" },
      { name: "description", content: "Average category scores and feedback trends across tutors." },
      { property: "og:title", content: "Analytics — Quality Dashboard" },
      { property: "og:description", content: "Average category scores and feedback trends across tutors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const feedback = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback });
  const rows = feedback.data ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + Number(r.overall_score), 0) / rows.length : 0;
  return (
    <AppShell title="Analytics">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Reviews</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Average score</p><p className="text-2xl font-bold">{avg.toFixed(1)}%</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Negative items</p><p className="text-2xl font-bold">{rows.reduce((s, r) => s + r.negative_count, 0)}</p></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Average by category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {CATEGORIES.map((c) => {
              const vals = rows.map((r) => r.category_scores?.[c.key]).filter((v): v is number => typeof v === "number");
              const a = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
              return (
                <div key={c.key}>
                  <div className="mb-1 flex justify-between text-sm"><span>{c.label}</span><span>{vals.length ? `${a.toFixed(1)}/5` : "—"}</span></div>
                  <Progress value={(a / 5) * 100} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
