import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CoinIcon } from "@/components/CoinIcon";
import { SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useBalances, useProfile } from "@/hooks/useAppData";
import { COINS, coinOf } from "@/lib/coins";
import { fmtAmount, fmtDate, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — International Digital" },
      { name: "description", content: "Request a withdrawal to your external crypto wallet." },
      { property: "og:title", content: "Withdraw — International Digital" },
      { property: "og:description", content: "Withdraw USDT and other coins after admin review." },
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const queryClient = useQueryClient();
  const { data: balances } = useBalances();
  const { data: profile } = useProfile();
  const [symbol, setSymbol] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: requests } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const available = balances?.[symbol] ?? 0;
  const parsed = Number(amount) || 0;
  const kycApproved = profile?.kyc_status === "approved";

  async function submit() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("app_request_withdrawal", {
        _symbol: symbol,
        _amount: parsed,
        _address: address.trim(),
        _source: "wallet",
      });
      if (error) throw error;
      toast.success("Withdrawal requested. Our team will review it shortly.");
      setAmount("");
      setAddress("");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Withdraw</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Requests are reviewed by our team before payout.
      </p>

      {!kycApproved ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Withdrawals above 1,000 require approved KYC verification. Complete KYC to unlock high
          limits.
        </div>
      ) : null}

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

      <div className="mt-4 surface-card space-y-4 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount ({symbol})</Label>
            <button className="text-xs text-primary" onClick={() => setAmount(String(available))}>
              Max {fmtAmount(available, coinOf(symbol).decimals)}
            </button>
          </div>
          <Input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Destination address ({coinOf(symbol).network})</Label>
          <Input
            id="address"
            value={address}
            maxLength={120}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste wallet address"
          />
        </div>
        <Button
          disabled={busy || parsed <= 0 || parsed > available || address.trim().length < 8}
          onClick={submit}
          className="w-full brand-gradient font-display text-primary-foreground"
        >
          {parsed > available ? `Insufficient ${symbol}` : busy ? "Submitting..." : "Request withdrawal"}
        </Button>
      </div>

      <SectionTitle>Requests</SectionTitle>
      <div className="space-y-2">
        {(requests ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No withdrawal requests yet.
          </p>
        ) : null}
        {(requests ?? []).map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
            <CoinIcon symbol={r.symbol} size={32} />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {fmtAmount(Number(r.amount), 6)} {r.symbol}
              </p>
              <p className="text-xs text-muted-foreground">
                {shortAddress(r.address)} · {fmtDate(r.created_at)}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                r.status === "approved"
                  ? "bg-success/15 text-success"
                  : r.status === "rejected"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-warning/15 text-warning",
              )}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
