import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfiles, nameOf, type FeedbackRow } from "@/lib/data";
import { CATEGORIES } from "@/lib/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/feedback/$id")({
  head: () => ({
    meta: [
      { title: "Feedback Report — Quality Dashboard" },
      { name: "description", content: "Detailed session feedback report with category scores." },
      { property: "og:title", content: "Feedback Report — Quality Dashboard" },
      { property: "og:description", content: "Detailed session feedback report with category scores." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportPage,
});

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} className="mt-2 text-2xl font-bold">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i} className="mt-5 text-lg font-semibold">{line.slice(3)}</h2>;
    if (line.startsWith("- ")) return <li key={i} className="ml-5 list-disc">{line.slice(2).replace(/\*\*/g, "")}</li>;
    if (!line.trim()) return null;
    return <p key={i} className="text-muted-foreground">{line.replace(/\*\*/g, "")}</p>;
  });
}

function ReportPage() {
  const { id } = Route.useParams();
  const feedback = useQuery({
    queryKey: ["feedback", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as FeedbackRow | null;
    },
  });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const row = feedback.data;

  return (
    <AppShell title="Feedback report">
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/feedback"><ArrowLeft className="mr-1 h-4 w-4" />Back to feedback</Link>
        </Button>
        {feedback.isLoading ? (
          <p className="text-muted-foreground">Loading report…</p>
        ) : !row ? (
          <Card><CardContent className="p-6">This report doesn't exist or you don't have access to it.</CardContent></Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{nameOf(profiles.data ?? [], row.tutor_id)}</h1>
                <p className="text-sm text-muted-foreground">
                  {row.session_date} · {row.slot} · Mentor: {nameOf(profiles.data ?? [], row.mentor_id)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base">{Number(row.overall_score).toFixed(1)}%</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                    toast.success("Report link copied");
                  }}
                >
                  <Copy className="mr-1 h-4 w-4" />Copy link
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((c) => (
                <Card key={c.key}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-semibold">
                      {row.category_scores?.[c.key] != null ? `${row.category_scores[c.key]}/5` : "—"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle>Report</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {row.report_markdown ? renderMarkdown(row.report_markdown) : <p>No report text.</p>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
