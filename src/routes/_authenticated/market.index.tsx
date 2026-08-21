import { createFileRoute, Link } from "@tanstack/react-router";

import { CoinIcon } from "@/components/CoinIcon";
import { useQuotes } from "@/hooks/useAppData";
import { COINS } from "@/lib/coins";
import { fmtPct, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/")({
  head: () => ({
    meta: [
      { title: "Market — International Digital" },
      { name: "description", content: "Live crypto prices and 24h changes for the coins we support." },
      { property: "og:title", content: "Market — International Digital" },
      { property: "og:description", content: "Live prices for BTC, ETH, USDT, SOL, TON and more." },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const { data: quotes, isFetching } = useQuotes();

  return (
    <div className="pb-6">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-2xl font-bold">Market</h1>
        <span className="text-xs text-muted-foreground">
          {isFetching ? "Updating..." : "Live prices"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {COINS.map((coin) => {
          const q = quotes?.[coin.symbol];
          const change = q?.change24h ?? 0;
          return (
            <Link
              key={coin.symbol}
              to="/market/$symbol"
              params={{ symbol: coin.symbol }}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:bg-elevated"
            >
              <CoinIcon symbol={coin.symbol} size={38} />
              <div className="flex-1">
                <p className="text-sm font-medium">{coin.name}</p>
                <p className="text-xs text-muted-foreground">
                  {coin.symbol} · {coin.network}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{fmtUsd(q?.price ?? 0)}</p>
                <p className={change >= 0 ? "text-xs text-success" : "text-xs text-destructive"}>
                  {fmtPct(change)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
