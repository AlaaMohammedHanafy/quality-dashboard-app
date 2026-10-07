import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CheckCircle2, ClipboardList, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ischoolLogo from "@/assets/ischool-logo-dark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iSchool DEMI DECI Quality Dashboard — Tutor & Mentor Feedback System" },
      {
        name: "description",
        content:
          "Evaluate tutor sessions with standardized feedback, automatic scoring, generated reports and exportable quality data.",
      },
      { property: "og:title", content: "iSchool DEMI DECI Quality Dashboard — Tutor & Mentor Feedback System" },
      {
        property: "og:description",
        content:
          "Mentors review sessions in seconds. Tutors track their scores. Team leaders monitor the whole team.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Fast session feedback",
    text: "Pick a tutor, date and slot, tick standardized comments and submit in under a minute.",
  },
  {
    icon: CheckCircle2,
    title: "Automatic scoring",
    text: "Weighted category scores and an overall quality score calculated on every submission.",
  },
  {
    icon: FileSpreadsheet,
    title: "Generated reports & export",
    text: "Every feedback creates a structured report with a shareable link and exportable data.",
  },
  {
    icon: BarChart3,
    title: "Performance tracking",
    text: "Trends, rankings and attention flags for mentors, tutors and team leaders.",
  },
];

function Landing() {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <img src={ischoolLogo} alt="iSchool" className="h-9 w-auto" />
          <span className="hidden border-l border-border pl-2.5 text-sm font-semibold sm:inline">
            DEMI · DECI Quality Dashboard
          </span>
        </div>
        {loading ? null : session ? (
          <Button asChild size="sm">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          iSchool DEMI · DECI Quality Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-6xl">
          Today's Generation, Tomorrow's Tech Leaders
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Mentors evaluate assigned tutors with predefined checkboxes. Scores, reports and exports
          are generated automatically.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to={session ? "/dashboard" : "/auth"}>
              {session ? "Go to dashboard" : "Get started"}
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border bg-card p-6">
            <feature.icon className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
