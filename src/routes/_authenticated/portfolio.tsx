import { createFileRoute } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CoinIcon } from "@/components/CoinIcon";
import { SectionTitle } from "@/components/AppShell";
import {
  useBalances,
  useInvestments,
  usePortfolioValue,
  useQuotes,
} from "@/hooks/useAppData";
import { fmtAmount, fmtPct, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — International Digital" },
      { name: "description", content: "Total portfolio value, profit and loss and asset allocation." },
      { property: "og:title", content: "Portfolio — International Digital" },
      { property: "og:description", content: "See your allocation, invested capital and 24h performance." },
    ],
  }),
  component: PortfolioPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function PortfolioPage() {
  const { data: balances } = useBalances();
  const { data: quotes } = useQuotes();
  const { data: investments } = useInvestments();
  const { rows, total } = usePortfolioValue(balances, quotes);

  const held = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const dayChange = rows.reduce(
    (acc, r) => acc + r.value * ((quotes?.[r.coin.symbol]?.change24h ?? 0) / 100),
    0,
  );
  const active = (investments ?? []).filter((i) => i.status === "active");
  const locked = active.reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingProfit = active.reduce((sum, i) => sum + Number(i.profit_amount), 0);
  const claimed = (investments ?? [])
    .filter((i) => i.status === "claimed")
    .reduce((sum, i) => sum + Number(i.profit_amount), 0);

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Portfolio</h1>

      <div className="mt-4 surface-card p-5">
        <p className="text-xs text-muted-foreground">Total value (wallet + locked)</p>
        <p className="mt-1 font-display text-3xl font-bold">{fmtUsd(total + locked)}</p>
        <p className={`mt-1 text-xs ${dayChange >= 0 ? "text-success" : "text-destructive"}`}>
          {dayChange >= 0 ? "+" : ""}
          {fmtUsd(dayChange)} ({fmtPct(total > 0 ? (dayChange / total) * 100 : 0)}) today
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Locked</p>
            <p className="mt-0.5 text-sm font-medium">{fmtUsd(locked)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Pending profit</p>
            <p className="mt-0.5 text-sm font-medium text-primary">{fmtUsd(pendingProfit)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Realised profit</p>
            <p className="mt-0.5 text-sm font-medium text-success">{fmtUsd(claimed)}</p>
          </div>
        </div>
      </div>

      <SectionTitle>Allocation</SectionTitle>
      {held.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Your allocation appears once you hold assets.
        </p>
      ) : (
        <div className="surface-card p-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={held.map((h) => ({ name: h.coin.symbol, value: h.value }))}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                >
                  {held.map((h, i) => (
                    <Cell key={h.coin.symbol} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => fmtUsd(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {held.map((h, i) => (
              <div key={h.coin.symbol} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <CoinIcon symbol={h.coin.symbol} size={26} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.coin.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtAmount(h.amount, h.coin.decimals)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{fmtUsd(h.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {total > 0 ? ((h.value / total) * 100).toFixed(1) : "0.0"}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
