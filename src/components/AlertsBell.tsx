import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAssignments, fetchFeedback, fetchProfiles, fetchSettings, nameOf } from "@/lib/data";
import { computeStreakAlerts, fetchNegativeComments } from "@/lib/alerts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function useStreakAlerts(enabled: boolean) {
  const { user, isStaff } = useAuth();
  const feedback = useQuery({ queryKey: ["feedback"], queryFn: fetchFeedback, enabled });
  const negatives = useQuery({ queryKey: ["negative-comments"], queryFn: fetchNegativeComments, enabled });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings, enabled });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments, enabled });
  if (!feedback.data || !negatives.data || !settings.data) return [];
  const mine = new Set(
    (assignments.data ?? [])
      .filter((a) => a.mentor_id === user?.id && a.status === "active")
      .map((a) => a.tutor_id),
  );
  const scoped = isStaff
    ? feedback.data
    : feedback.data.filter((f) => mine.has(f.tutor_id) || f.mentor_id === user?.id);
  return computeStreakAlerts(scoped, negatives.data, settings.data.thresholds.negative_streak);
}

export function AlertsBell() {
  const { roles, isStaff } = useAuth();
  const enabled = isStaff || roles.includes("mentor");
  const alerts = useStreakAlerts(enabled);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, enabled });
  if (!enabled) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative" aria-label="Alerts">
          <Bell className="size-4" />
          {alerts.length > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {alerts.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Needs attention</p>
          <p className="text-xs text-muted-foreground">
            Repeated improvement feedback in the same category
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No alerts right now.</p>
          ) : (
            alerts.map((a) => (
              <Link
                key={`${a.tutorId}-${a.category}`}
                to="/feedback/$id"
                params={{ id: a.lastFeedbackId }}
                className="block border-b px-4 py-3 text-sm last:border-0 hover:bg-muted"
              >
                <p className="font-medium">{nameOf(profiles.data ?? [], a.tutorId)}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-destructive">{a.category}</span> flagged in{" "}
                  {a.streak} sessions in a row · last {a.lastDate}
                </p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
