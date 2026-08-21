import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useBalances, useInvestments, usePlans } from "@/hooks/useAppData";
import { countdown, fmtAmount, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({
    meta: [
      { title: "Invest — International Digital" },
      { name: "description", content: "Invest USDT in 7, 15 or 30 day plans and claim your profit." },
      { property: "og:title", content: "Invest — International Digital" },
      { property: "og:description", content: "Fixed-term crypto investment plans with transparent returns." },
    ],
  }),
  component: InvestPage,
});

function InvestPage() {
  const queryClient = useQueryClient();
  const { data: plans } = usePlans();
  const { data: investments } = useInvestments();
  const { data: balances } = useBalances();
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const activePlans = (plans ?? []).filter((p) => p.active);
  const plan = activePlans.find((p) => p.id === selected) ?? activePlans[0];
  const usdt = balances?.["USDT"] ?? 0;
  const parsed = Number(amount) || 0;
  const expectedProfit = plan ? (parsed * Number(plan.profit_percent)) / 100 : 0;

  async function invest() {
    if (!plan) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("app_invest", { _plan_id: plan.id, _amount: parsed });
      if (error) throw error;
      toast.success(`Invested ${fmtAmount(parsed, 2)} USDT in the ${plan.name} plan`);
      setAmount("");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Investment failed");
    } finally {
      setBusy(false);
    }
  }

  async function claim(id: string) {
    try {
      const { error } = await supabase.rpc("app_claim_investment", { _investment_id: id });
      if (error) throw error;
      toast.success("Profit claimed and added to your USDT balance");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim yet");
    }
  }

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Invest</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lock USDT for a fixed term and earn a guaranteed plan return.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {activePlans.map((p) => {
          const active = plan?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                active ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <p className="font-display text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.duration_days} days</p>
              <p className={cn("mt-2 font-display text-lg font-bold", active ? "text-primary" : "")}>
                {Number(p.profit_percent)}%
              </p>
            </button>
          );
        })}
      </div>

      {plan ? (
        <div className="mt-4 surface-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Amount (USDT)</span>
            <button type="button" className="text-primary" onClick={() => setAmount(String(usdt))}>
              Balance {fmtAmount(usdt, 2)}
            </button>
          </div>
          <Input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={`Min ${fmtAmount(Number(plan.min_amount), 0)}`}
            className="mt-2 border-0 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span>
                {plan.name} · {plan.duration_days} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected profit</span>
              <span className="text-success">
                +{fmtAmount(expectedProfit, 2)} USDT ({Number(plan.profit_percent)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total at maturity</span>
              <span>{fmtAmount(parsed + expectedProfit, 2)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Limits</span>
              <span>
                {fmtAmount(Number(plan.min_amount), 0)} – {fmtAmount(Number(plan.max_amount), 0)} USDT
              </span>
            </div>
          </div>
          <Button
            disabled={busy || parsed <= 0 || parsed > usdt}
            onClick={invest}
            className="mt-4 w-full brand-gradient font-display text-primary-foreground"
          >
            {parsed > usdt ? "Insufficient USDT" : busy ? "Processing..." : "Confirm investment"}
          </Button>
        </div>
      ) : null}

      <SectionTitle>Your plans</SectionTitle>
      <div className="space-y-2">
        {(investments ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No investments yet. Pick a plan above to start earning.
          </p>
        ) : null}
        {(investments ?? []).map((inv) => {
          const start = new Date(inv.start_at).getTime();
          const end = new Date(inv.end_at).getTime();
          const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
          const matured = Date.now() >= end;
          return (
            <div key={inv.id} className="surface-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-sm font-semibold">
                    {inv.plan_name} · {inv.duration_days} days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtAmount(Number(inv.amount), 2)} USDT · started {fmtDate(inv.start_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    inv.status === "claimed"
                      ? "bg-secondary text-muted-foreground"
                      : matured
                        ? "bg-success/15 text-success"
                        : "bg-primary/15 text-primary",
                  )}
                >
                  {inv.status === "claimed" ? "Claimed" : matured ? "Matured" : "Running"}
                </span>
              </div>
              <Progress value={inv.status === "claimed" ? 100 : pct} className="mt-3 h-1.5" />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {inv.status === "claimed" ? "Completed" : countdown(inv.end_at)}
                </span>
                <span className="flex items-center gap-1 text-success">
                  <Sparkles className="h-3.5 w-3.5" />+{fmtAmount(Number(inv.profit_amount), 2)} USDT
                </span>
              </div>
              {inv.status === "active" ? (
                <Button
                  disabled={!matured}
                  onClick={() => claim(inv.id)}
                  className="mt-3 w-full"
                  variant={matured ? "default" : "secondary"}
                >
                  {matured ? "Claim profit" : "Claim when matured"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
