import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";

import { CoinIcon } from "@/components/CoinIcon";
import { SectionTitle } from "@/components/AppShell";
import {
  useBalances,
  usePortfolioValue,
  useQuotes,
  useTransactions,
} from "@/hooks/useAppData";
import { coinOf } from "@/lib/coins";
import { fmtAmount, fmtDate, fmtPct, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — International Digital" },
      { name: "description", content: "Your USDT and crypto balances, deposits and withdrawals." },
      { property: "og:title", content: "Wallet — International Digital" },
      { property: "og:description", content: "Track balances, deposit, withdraw and review activity." },
    ],
  }),
  component: WalletPage,
});

const ACTIONS = [
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/swap", label: "Swap", icon: ArrowLeftRight },
  { to: "/invest", label: "Invest", icon: TrendingUp },
] as const;

function WalletPage() {
  const [hidden, setHidden] = useState(false);
  const { data: balances } = useBalances();
  const { data: quotes } = useQuotes();
  const { data: transactions } = useTransactions(12);
  const { rows, total } = usePortfolioValue(balances, quotes);

  const change = rows.reduce(
    (acc, r) => acc + r.value * ((quotes?.[r.coin.symbol]?.change24h ?? 0) / 100),
    0,
  );

  return (
    <div className="pb-6">
      <div className="surface-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full brand-gradient opacity-20 blur-2xl" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Total balance
          <button onClick={() => setHidden(!hidden)} aria-label="Toggle balance visibility">
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="mt-1 font-display text-3xl font-bold">{hidden ? "••••••" : fmtUsd(total)}</p>
        <p className={`mt-1 text-xs ${change >= 0 ? "text-success" : "text-destructive"}`}>
          {hidden ? "•••" : `${change >= 0 ? "+" : ""}${fmtUsd(change)} today`}
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary/70 py-3 text-[11px] font-medium transition-colors hover:bg-secondary"
            >
              <action.icon className="h-4 w-4 text-primary" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <SectionTitle
        action={
          <Link to="/market" className="text-xs text-primary">
            Market
          </Link>
        }
      >
        Your assets
      </SectionTitle>
      <div className="space-y-2">
        {rows
          .slice()
          .sort((a, b) => b.value - a.value)
          .map(({ coin, amount, price, value }) => {
            const pct = quotes?.[coin.symbol]?.change24h ?? 0;
            return (
              <Link
                key={coin.symbol}
                to="/market/$symbol"
                params={{ symbol: coin.symbol }}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
              >
                <CoinIcon symbol={coin.symbol} size={38} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{coin.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtUsd(price)}{" "}
                    <span className={pct >= 0 ? "text-success" : "text-destructive"}>
                      {fmtPct(pct)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{fmtAmount(amount, coin.decimals)}</p>
                  <p className="text-xs text-muted-foreground">{fmtUsd(value)}</p>
                </div>
              </Link>
            );
          })}
      </div>

      <SectionTitle>Recent activity</SectionTitle>
      <div className="space-y-2">
        {(transactions ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No transactions yet. Make your first deposit to get started.
          </p>
        ) : null}
        {(transactions ?? []).map((tx) => {
          const amount = Number(tx.amount);
          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
            >
              <CoinIcon symbol={tx.symbol} size={34} />
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">{tx.type}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(tx.created_at)}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-medium ${amount >= 0 ? "text-success" : "text-foreground"}`}
                >
                  {amount >= 0 ? "+" : ""}
                  {fmtAmount(amount, coinOf(tx.symbol).decimals)} {tx.symbol}
                </p>
                <p
                  className={`text-xs capitalize ${
                    tx.status === "pending"
                      ? "text-warning"
                      : tx.status === "rejected"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {tx.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
