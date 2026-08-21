import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

import { CoinIcon } from "@/components/CoinIcon";
import { useBalances, useQuotes } from "@/hooks/useAppData";
import { COIN_MAP } from "@/lib/coins";
import { fmtAmount, fmtPct, fmtUsd } from "@/lib/format";
import { getCandles } from "@/lib/prices.functions";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "24H", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "1Y", days: 365 },
] as const;

export const Route = createFileRoute("/_authenticated/market/$symbol")({
  beforeLoad: ({ params }) => {
    if (!COIN_MAP[params.symbol.toUpperCase()]) throw notFound();
  },
  head: ({ params }) => {
    const coin = COIN_MAP[params.symbol.toUpperCase()];
    const name = coin?.name ?? "Coin";
    return {
      meta: [
        { title: `${name} price chart — International Digital` },
        { name: "description", content: `Live ${name} (${params.symbol}) price chart and 24h change.` },
        { property: "og:title", content: `${name} price chart — International Digital` },
        { property: "og:description", content: `Track ${name} prices and swap it inside your wallet.` },
      ],
    };
  },
  component: CoinPage,
});

function CoinPage() {
  const { symbol: raw } = Route.useParams();
  const symbol = raw.toUpperCase();
  const coin = COIN_MAP[symbol]!;
  const [range, setRange] = useState<number>(1);
  const { data: quotes } = useQuotes();
  const { data: balances } = useBalances();

  const { data: candles } = useQuery({
    queryKey: ["candles", symbol, range],
    queryFn: () => getCandles({ data: { symbol, days: range } }),
    refetchInterval: 120_000,
  });

  const quote = quotes?.[symbol];
  const change = quote?.change24h ?? 0;
  const series = (candles ?? []).map((c) => ({
    t: c.t,
    price: c.c,
    high: c.h,
    low: c.l,
  }));
  const up = change >= 0;

  return (
    <div className="pb-6">
      <Link to="/market" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Market
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <CoinIcon symbol={symbol} size={44} />
        <div>
          <h1 className="font-display text-xl font-bold">{coin.name}</h1>
          <p className="text-xs text-muted-foreground">
            {coin.symbol} · {coin.network}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p className="font-display text-3xl font-bold">{fmtUsd(quote?.price ?? 0)}</p>
        <p className={cn("pb-1 text-sm", up ? "text-success" : "text-destructive")}>
          {fmtPct(change)} 24h
        </p>
      </div>

      <div className="mt-4 surface-card p-3">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={up ? "var(--color-success)" : "var(--color-destructive)"}
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor={up ? "var(--color-success)" : "var(--color-destructive)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
                formatter={(value: number) => [fmtUsd(value), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={up ? "var(--color-success)" : "var(--color-destructive)"}
                strokeWidth={2}
                fill="url(#priceFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                range === r.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Your holdings</p>
          <p className="mt-1 font-display text-lg font-semibold">
            {fmtAmount(balances?.[symbol] ?? 0, coin.decimals)} {symbol}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtUsd((balances?.[symbol] ?? 0) * (quote?.price ?? 0))}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Period range</p>
          <p className="mt-1 text-sm text-success">
            H {fmtUsd(Math.max(...series.map((s) => s.high), quote?.price ?? 0))}
          </p>
          <p className="text-sm text-destructive">
            L {fmtUsd(Math.min(...series.map((s) => s.low), quote?.price ?? 0))}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/swap"
          className="flex-1 rounded-xl brand-gradient py-3 text-center font-display text-sm font-semibold text-primary-foreground"
        >
          Swap {symbol}
        </Link>
        <Link
          to="/deposit"
          className="flex-1 rounded-xl border border-border bg-card py-3 text-center font-display text-sm font-semibold"
        >
          Deposit
        </Link>
      </div>
    </div>
  );
}
