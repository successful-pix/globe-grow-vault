import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { COINS, coinOf } from "@/lib/coins";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit — International Digital" },
      { name: "description", content: "Get your deposit address for USDT, BTC, ETH and other coins." },
      { property: "og:title", content: "Deposit — International Digital" },
      { property: "og:description", content: "Fund your wallet with USDT, BTC, ETH and more." },
    ],
  }),
  component: DepositPage,
});

function DepositPage() {
  const [symbol, setSymbol] = useState("USDT");

  const { data: addresses } = useQuery({
    queryKey: ["wallet-addresses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_addresses")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const forCoin = (addresses ?? []).filter((a) => a.symbol === symbol);
  // A personal address assigned by an admin always wins over the shared one.
  const personal = forCoin.filter((a) => a.user_id);
  const shown = personal.length > 0 ? personal : forCoin;

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
    toast.success("Address copied");
  }

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Deposit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send funds to the address below. Your balance is credited after network confirmation.
      </p>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
        {COINS.map((coin) => (
          <button
            key={coin.symbol}
            onClick={() => setSymbol(coin.symbol)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
              symbol === coin.symbol ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
            )}
          >
            <CoinIcon symbol={coin.symbol} size={20} />
            {coin.symbol}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No {symbol} deposit address is configured yet. Please contact support.
          </p>
        ) : null}
        {shown.map((entry) => (
          <div key={entry.id} className="surface-card p-4">
            <div className="flex items-center gap-2">
              <CoinIcon symbol={entry.symbol} size={28} />
              <div>
                <p className="text-sm font-medium">
                  {coinOf(entry.symbol).name} · {entry.network}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {entry.user_id ? "Your personal address" : "Shared deposit address"}
                </p>
              </div>
            </div>
            <p className="mt-3 break-all rounded-xl bg-secondary/70 p-3 font-mono text-xs">
              {entry.address}
            </p>
            <Button variant="outline" className="mt-3 w-full" onClick={() => copy(entry.address)}>
              <Copy className="mr-2 h-4 w-4" /> Copy address
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Send only {symbol} on the network shown. Sending another asset or using the wrong network can
        result in permanent loss.
      </div>
    </div>
  );
}
