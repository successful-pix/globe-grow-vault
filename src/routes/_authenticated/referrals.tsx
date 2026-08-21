import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift, Share2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { fmtAmount, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — International Digital" },
      { name: "description", content: "Invite friends, earn USDT bonuses and track referral earnings." },
      { property: "og:title", content: "Referrals — International Digital" },
      { property: "og:description", content: "Earn 10 USDT for every friend who joins with your code." },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const code = profile?.referral_code ?? "";
  const link = typeof window !== "undefined" && code ? `${window.location.origin}/auth?mode=signup&ref=${code}` : "";

  const { data: referred } = useQuery({
    queryKey: ["referred-users", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .eq("referred_by", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bonuses } = useQuery({
    queryKey: ["referral-bonuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "referral")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const earnings = Number(profile?.referral_earnings ?? 0);

  async function share() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "International Digital", url: link });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    void navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  }

  async function withdrawReferral() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("app_request_withdrawal", {
        _symbol: "USDT",
        _amount: Number(amount) || 0,
        _address: address.trim(),
        _source: "referral",
      });
      if (error) throw error;
      toast.success("Referral withdrawal requested");
      setAmount("");
      setAddress("");
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl font-bold">Referrals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Earn 10 USDT instantly for every friend who signs up with your code.
      </p>

      <div className="mt-5 surface-card p-5">
        <p className="text-xs text-muted-foreground">Your referral code</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-[0.2em] brand-text">{code || "—"}</p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Code copied");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy code
          </Button>
          <Button className="flex-1 brand-gradient font-display text-primary-foreground" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" /> Share link
          </Button>
        </div>
        <p className="mt-3 break-all rounded-xl bg-secondary/70 p-3 font-mono text-[11px] text-muted-foreground">
          {link}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <Users className="h-4 w-4 text-primary" />
          <p className="mt-2 font-display text-xl font-bold">{referred?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Friends referred</p>
        </div>
        <div className="surface-card p-4">
          <Gift className="h-4 w-4 text-accent" />
          <p className="mt-2 font-display text-xl font-bold">{fmtAmount(earnings, 2)}</p>
          <p className="text-xs text-muted-foreground">USDT earned</p>
        </div>
      </div>

      <SectionTitle>Withdraw referral balance</SectionTitle>
      <div className="surface-card space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="refAmount">Amount (USDT)</Label>
          <Input
            id="refAmount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={`Available ${fmtAmount(earnings, 2)}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="refAddress">USDT address</Label>
          <Input
            id="refAddress"
            value={address}
            maxLength={120}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste wallet address"
          />
        </div>
        <Button
          disabled={busy || (Number(amount) || 0) <= 0 || address.trim().length < 8}
          onClick={withdrawReferral}
          className="w-full"
        >
          {busy ? "Submitting..." : "Withdraw referral earnings"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Referral earnings are part of your USDT wallet balance and can also be invested directly.
        </p>
      </div>

      <SectionTitle>Referral activity</SectionTitle>
      <div className="space-y-2">
        {(referred ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No referrals yet. Share your link to start earning.
          </p>
        ) : null}
        {(referred ?? []).map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3">
            <div>
              <p className="text-sm font-medium">{user.email ?? "New user"}</p>
              <p className="text-xs text-muted-foreground">Joined {fmtDate(user.created_at)}</p>
            </div>
            <span className="text-sm text-success">+10 USDT</span>
          </div>
        ))}
        {(bonuses ?? []).length > 0 ? (
          <p className="pt-2 text-[11px] text-muted-foreground">
            {bonuses!.length} referral bonus payment{bonuses!.length === 1 ? "" : "s"} credited to your
            wallet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
