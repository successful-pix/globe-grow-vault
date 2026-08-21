import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBalances, useQuotes } from "@/hooks/useAppData";
import { COINS, coinOf } from "@/lib/coins";
import { fmtAmount, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/swap")({
  head: () => ({
    meta: [
      { title: "Swap — International Digital" },
      { name: "description", content: "Swap between BTC, ETH, USDT and more at live rates." },
      { property: "og:title", content: "Swap — International Digital" },
      { property: "og:description", content: "Instant token swaps with live rates and clear network fees." },
    ],
  }),
  component: SwapPage,
});

const NETWORK_FEE_USD: Record<string, number> = {
  BTC: 2.4,
  ETH: 1.85,
  USDT: 0.9,
  BNB: 0.24,
  SOL: 0.02,
  XRP: 0.01,
  ADA: 0.18,
  DOGE: 0.12,
  TON: 0.03,
  MATIC: 0.01,
};

function CoinPicker({
  value,
  onChange,
  exclude,
}: {
  value: string;
  onChange: (symbol: string) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const coin = coinOf(value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-medium"
      >
        <CoinIcon symbol={value} size={24} />
        {coin.symbol}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select a coin</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {COINS.filter((c) => c.symbol !== exclude).map((c) => (
              <button
                key={c.symbol}
                onClick={() => {
                  onChange(c.symbol);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary"
              >
                <CoinIcon symbol={c.symbol} size={32} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.symbol}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SwapPage() {
  const queryClient = useQueryClient();
  const { data: quotes } = useQuotes();
  const { data: balances } = useBalances();
  const [from, setFrom] = useState("USDT");
  const [to, setTo] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const fromPrice = quotes?.[from]?.price ?? 0;
  const toPrice = quotes?.[to]?.price ?? 0;
  const rate = toPrice > 0 ? fromPrice / toPrice : 0;
  const fee = NETWORK_FEE_USD[from] ?? 0.5;
  const parsedAmount = Number(amount) || 0;
  const usdValue = parsedAmount * fromPrice;
  const receive = useMemo(() => {
    const net = Math.max(usdValue - fee, 0);
    return toPrice > 0 ? net / toPrice : 0;
  }, [usdValue, fee, toPrice]);

  const available = balances?.[from] ?? 0;
  const insufficient = parsedAmount > available;

  async function executeSwap() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("app_swap", {
        _from: from,
        _to: to,
        _from_amount: parsedAmount,
        _to_amount: Number(receive.toFixed(8)),
        _rate: Number(rate.toFixed(10)),
        _fee: fee,
      });
      if (error) throw error;
      toast.success(`Swapped ${fmtAmount(parsedAmount, 6)} ${from} to ${fmtAmount(receive, 6)} ${to}`);
      setAmount("");
      setConfirming(false);
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Swap</h1>
      <p className="mt-1 text-sm text-muted-foreground">Trade instantly at live market rates.</p>

      <div className="mt-5 space-y-2">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>You pay</span>
            <button
              onClick={() => setAmount(String(available))}
              className="text-primary"
              type="button"
            >
              Max {fmtAmount(available, coinOf(from).decimals)}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0.00"
              className="border-0 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:ring-0"
            />
            <CoinPicker value={from} onChange={setFrom} exclude={to} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">≈ {fmtUsd(usdValue)}</p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
              setAmount("");
            }}
            className="-my-4 z-10 rounded-full border border-border bg-elevated p-2.5 text-primary"
            aria-label="Switch coins"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs text-muted-foreground">You receive</span>
          <div className="mt-2 flex items-center gap-3">
            <p className="flex-1 font-display text-2xl">{fmtAmount(receive, 8)}</p>
            <CoinPicker value={to} onChange={setTo} exclude={from} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ≈ {fmtUsd(receive * toPrice)} · balance {fmtAmount(balances?.[to] ?? 0, coinOf(to).decimals)}
          </p>
        </div>
      </div>

      <div className="mt-4 surface-card space-y-2 p-4 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Exchange rate</span>
          <span>
            1 {from} ≈ {fmtAmount(rate, 8)} {to}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated network fee</span>
          <span>{fmtUsd(fee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Provider</span>
          <span>International Digital Router</span>
        </div>
        <p className="flex items-start gap-1.5 pt-1 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Rates refresh every 45 seconds. The final amount is locked when you confirm.
        </p>
      </div>

      <Button
        disabled={parsedAmount <= 0 || insufficient || rate <= 0}
        onClick={() => setConfirming(true)}
        className={cn("mt-5 w-full brand-gradient font-display text-primary-foreground")}
      >
        {insufficient ? `Insufficient ${from}` : "Review swap"}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm swap</DialogTitle>
            <DialogDescription>Please review the details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">You pay</span>
              <span>
                {fmtAmount(parsedAmount, 8)} {from}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">You receive</span>
              <span>
                {fmtAmount(receive, 8)} {to}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>
                1 {from} ≈ {fmtAmount(rate, 8)} {to}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network fee</span>
              <span>{fmtUsd(fee)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy}
              onClick={executeSwap}
              className="w-full brand-gradient font-display text-primary-foreground"
            >
              {busy ? "Swapping..." : "Confirm swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
