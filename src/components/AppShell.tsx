import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ChartPie,
  LineChart,
  LogOut,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/swap", label: "Swap", icon: ArrowLeftRight },
  { to: "/invest", label: "Invest", icon: TrendingUp },
  { to: "/portfolio", label: "Portfolio", icon: ChartPie },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const kyc = profile?.kyc_status ?? "none";

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 glow-bg" />
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <Link to="/wallet" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient font-display text-sm font-bold text-primary-foreground">
              ID
            </span>
            <span className="font-display text-sm font-semibold leading-tight">
              International
              <span className="block text-xs font-normal text-muted-foreground">Digital</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/kyc"
              className={cn(
                "flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium",
                kyc === "approved"
                  ? "border-success/40 text-success"
                  : kyc === "pending"
                    ? "border-warning/40 text-warning"
                    : "text-muted-foreground",
              )}
            >
              {kyc === "approved" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
              KYC
            </Link>
            <Link
              to="/referrals"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Referrals"
            >
              <Users className="h-4 w-4" />
            </Link>
            {isAdmin ? (
              <Link
                to="/admin"
                className="rounded-full p-2 text-accent transition-colors hover:text-accent/80"
                aria-label="Admin panel"
              >
                <Shield className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              onClick={signOut}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-md px-4 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_currentColor]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="font-display text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}
