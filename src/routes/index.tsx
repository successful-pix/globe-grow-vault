import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { useEffect } from "react";

import { CoinIcon } from "@/components/CoinIcon";
import { useQuotes, useSession } from "@/hooks/useAppData";
import { COINS } from "@/lib/coins";
import { fmtPct, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "International Digital — Wallet, Swap & Crypto Investments" },
      {
        name: "description",
        content:
          "Hold USDT, BTC, ETH and more. Swap tokens in seconds, invest in 7, 15 or 30 day plans and earn referral bonuses.",
      },
      { property: "og:title", content: "International Digital — Wallet, Swap & Crypto Investments" },
      {
        property: "og:description",
        content:
          "A premium mobile crypto wallet: real-time prices, instant swaps, fixed-term investment plans and referral rewards.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Wallet, title: "Multi-coin wallet", text: "USDT, BTC, ETH, SOL, TON and more in one place." },
  { icon: ArrowLeftRight, title: "Instant swaps", text: "Live rates with transparent network fees." },
  { icon: TrendingUp, title: "Investment plans", text: "Earn up to 28% on 7, 15 and 30 day plans." },
  { icon: ShieldCheck, title: "Verified & secure", text: "KYC verification and admin-reviewed payouts." },
];

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { data: quotes } = useQuotes();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/wallet", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] glow-bg" />
      <div className="relative mx-auto w-full max-w-md px-5 pb-16 pt-10">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient font-display text-sm font-bold text-primary-foreground">
            ID
          </span>
          <span className="font-display text-base font-semibold">International Digital</span>
        </div>

        <h1 className="mt-10 font-display text-4xl font-bold leading-tight">
          Your money,{" "}
          <span className="brand-text">digital</span> and working for you.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          A premium crypto wallet with instant swaps, fixed-term investment plans and referral
          rewards — built for mobile.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-xl brand-gradient py-3.5 text-center font-display text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            Create free account
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-xl border border-border bg-card py-3.5 text-center font-display text-sm font-semibold"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-9 surface-card p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live market
          </p>
          <div className="space-y-3">
            {COINS.slice(0, 4).map((coin) => {
              const q = quotes?.[coin.symbol];
              const change = q?.change24h ?? 0;
              return (
                <div key={coin.symbol} className="flex items-center gap-3">
                  <CoinIcon symbol={coin.symbol} size={34} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{coin.name}</p>
                    <p className="text-xs text-muted-foreground">{coin.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{fmtUsd(q?.price ?? 0)}</p>
                    <p className={change >= 0 ? "text-xs text-success" : "text-xs text-destructive"}>
                      {fmtPct(change)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface-card p-4">
              <f.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-display text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
