import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertsBell } from "@/components/AlertsBell";

type NavItem = { to: string; label: string; icon: typeof Users; show: (ctx: Ctx) => boolean };
type Ctx = { isStaff: boolean; isMentor: boolean; isAdmin: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/tutors", label: "My Tutors", icon: Users, show: (c) => c.isMentor || c.isStaff },
  { to: "/assignments", label: "Assign Tutors", icon: GraduationCap, show: (c) => c.isStaff },
  { to: "/sessions", label: "Sessions", icon: ClipboardList, show: (c) => c.isMentor || c.isStaff },
  { to: "/feedback/new", label: "New Feedback", icon: PlusCircle, show: (c) => c.isMentor || c.isStaff },
  { to: "/feedback", label: "Feedback", icon: FileText, show: () => true },
  { to: "/analytics", label: "Analytics", icon: BarChart3, show: (c) => c.isMentor || c.isStaff },
  { to: "/insights", label: "AI Insights", icon: Sparkles, show: (c) => c.isMentor || c.isStaff },
  { to: "/settings", label: "Settings", icon: Settings, show: (c) => c.isAdmin },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { profile, roles, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const ctx: Ctx = {
    isStaff,
    isMentor: roles.includes("mentor"),
    isAdmin: roles.includes("admin"),
  };

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <GraduationCap className="size-6 text-sidebar-primary" />
          <div>
            <p className="text-sm font-bold leading-tight">Quality Dashboard</p>
            <p className="text-xs text-sidebar-foreground/60">Tutor & Mentor Feedback</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((item) => item.show(ctx)).map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-lg bg-sidebar-accent/50 p-3">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? "—"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-[10px] capitalize">
                {role.replace("_", " ")}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-sidebar-foreground/80" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-4 md:px-8">
          <h1 className="text-lg font-bold tracking-tight md:text-xl">{title}</h1>
          <div className="flex items-center gap-2">
            <AlertsBell />
            <Button variant="outline" size="sm" className="md:hidden" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {NAV.filter((item) => item.show(ctx)).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
