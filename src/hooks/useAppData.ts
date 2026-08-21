import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { COINS, FALLBACK_PRICES } from "@/lib/coins";
import { getQuotes, type Quotes } from "@/lib/prices.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: () => getQuotes(),
    refetchInterval: 45_000,
    placeholderData: () =>
      Object.fromEntries(
        COINS.map((c) => [c.symbol, { price: FALLBACK_PRICES[c.symbol] ?? 1, change24h: 0 }]),
      ) as Quotes,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("balances").select("symbol, amount");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.symbol] = Number(row.amount);
      return map;
    },
  });
}

export function useTransactions(limit = 40) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_plans")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePortfolioValue(
  balances: Record<string, number> | undefined,
  quotes: Quotes | undefined,
) {
  const rows = COINS.map((coin) => {
    const amount = balances?.[coin.symbol] ?? 0;
    const price = quotes?.[coin.symbol]?.price ?? FALLBACK_PRICES[coin.symbol] ?? 0;
    return { coin, amount, price, value: amount * price };
  });
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return { rows, total };
}
