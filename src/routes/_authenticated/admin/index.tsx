import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,

  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !role) {
      throw redirect({ to: "/wallet" });
    }

    return {
      user: data.user,
    };
  },

  head: () => ({
    meta: [
      {
        title: "Admin — Globe Grow Vault",
      },
    ],
  }),

  component: AdminPage,
});

type AdminTab =
  | "overview"
  | "users"
  | "balances"
  | "withdrawals"
  | "kyc"
  | "plans"
  | "transactions";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  referral_code: string;
  kyc_status: "none" | "pending" | "approved" | "rejected";
  referral_earnings: number;
  created_at: string;
  usdt_balance: number;
  referred_count: number;
};

type AdminStats = {
  total_users: number;
  total_invested: number;
  active_investments: number;
  total_swap_volume: number;
  pending_withdrawals: number;
  pending_kyc: number;
  usdt_liability: number;
};

type Withdrawal = {
  id: string;
  user_id: string;
  symbol: string;
  amount: number;
  address: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type KycSubmission = {
  id: string;
  user_id: string;
  full_name: string;
  document_path: string | null;
  selfie_path: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type InvestmentPlan = {
  id: string;
  name: string;
  duration_days: number;
  profit_percent: number;
  min_amount: number;
  max_amount: number;
  active: boolean;
  created_at: string;
};

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  symbol: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
};

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");

  const tabs: {
    id: AdminTab;
    label: string;
    icon: typeof Wallet;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: TrendingUp,
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
    },
    {
      id: "balances",
      label: "Balances",
      icon: CircleDollarSign,
    },
    {
      id: "withdrawals",
      label: "Withdrawals",
      icon: ArrowDownToLine,
    },
    {
      id: "kyc",
      label: "KYC",
      icon: FileCheck2,
    },
    {
      id: "plans",
      label: "Plans",
      icon: TrendingUp,
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: Clock3,
    },
  ];

  return (
    <div className="min-h-screen pb-10">
      <AdminHeader />

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-border bg-card p-2">
          {tabs.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  tab === item.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersPanel />}
      {tab === "balances" && <BalancePanel />}
      {tab === "withdrawals" && <WithdrawalsPanel />}
      {tab === "kyc" && <KycPanel />}
      {tab === "plans" && <PlansPanel />}
      {tab === "transactions" && <TransactionsPanel />}
    </div>
  );
}

function AdminHeader() {
  const queryClient = useQueryClient();

  return (
    <header className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/wallet"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold">
                Admin Console
              </h1>

              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Admin
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Globe Grow Vault administration
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            queryClient.invalidateQueries();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function Overview() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");

      if (error) throw error;

      return (data ?? {}) as AdminStats;
    },
  });

  const cards = [
    {
      label: "Total users",
      value: formatNumber(stats?.total_users ?? 0),
      icon: Users,
    },
    {
      label: "Total invested",
      value: formatAmount(stats?.total_invested ?? 0),
      icon: TrendingUp,
    },
    {
      label: "Active investments",
      value: formatNumber(stats?.active_investments ?? 0),
      icon: ShieldCheck,
    },
    {
      label: "Swap volume",
      value: formatAmount(stats?.total_swap_volume ?? 0),
      icon: ArrowUpRight,
    },
    {
      label: "Pending withdrawals",
      value: formatNumber(stats?.pending_withdrawals ?? 0),
      icon: ArrowDownToLine,
    },
    {
      label: "Pending KYC",
      value: formatNumber(stats?.pending_kyc ?? 0),
      icon: FileCheck2,
    },
    {
      label: "USDT liability",
      value: `${formatNumber(stats?.usdt_liability ?? 0)} USDT`,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="mt-5">
      <SectionHeading
        title="Overview"
        description="Live platform statistics"
      />

      {error ? (
        <ErrorBox message={(error as Error).message} />
      ) : null}

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 text-lg font-bold">
                    {card.value}
                  </div>

                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {card.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <QuickAction
              title="Pending withdrawals"
              description={`${stats?.pending_withdrawals ?? 0} withdrawal request(s) waiting`}
              icon={ArrowDownToLine}
              onClick={() => {
                document
                  .getElementById("admin-withdrawal-preview")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            />

            <QuickAction
              title="Pending KYC"
              description={`${stats?.pending_kyc ?? 0} KYC submission(s) waiting`}
              icon={FileCheck2}
              onClick={() => {
                document
                  .getElementById("admin-kyc-preview")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            />
          </div>

          <PendingPreview
            id="admin-withdrawal-preview"
            title="Recent pending withdrawals"
            type="withdrawals"
          />

          <PendingPreview
            id="admin-kyc-preview"
            title="Recent pending KYC"
            type="kyc"
          />
        </>
      )}
    </div>
  );
}

function PendingPreview({
  id,
  title,
  type,
}: {
  id: string;
  title: string;
  type: "withdrawals" | "kyc";
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-preview", type],
    queryFn: async () => {
      if (type === "withdrawals") {
        const { data, error } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        return data as Withdrawal[];
      }

      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return data as KycSubmission[];
    },
  });

  return (
    <div id={id} className="mt-5 rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold">{title}</h3>
      </div>

      {isLoading ? (
        <div className="p-4">
          <Loading />
        </div>
      ) : !data?.length ? (
        <EmptyState message="Nothing pending." />
      ) : (
        <div className="divide-y divide-border">
          {data.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm">
                  {type === "withdrawals"
                    ? `${item.amount} ${item.symbol}`
                    : item.full_name}
                </div>

                <div className="truncate text-[11px] text-muted-foreground">
                  {item.user_id}
                </div>
              </div>

              <span className="rounded-full bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

function UsersPanel() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users");

      if (error) throw error;

      return (data ?? []) as AdminUser[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return data ?? [];

    return (data ?? []).filter((user) =>
      [
        user.email,
        user.full_name,
        user.referral_code,
        user.id,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q),
        ),
    );
  }, [data, search]);

  return (
    <div className="mt-5">
      <SectionHeading
        title="Users"
        description={`${data?.length ?? 0} registered users`}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, name, referral code or ID..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {error ? (
        <ErrorBox message={(error as Error).message} />
      ) : null}

      {isLoading ? (
        <Loading />
      ) : !filtered.length ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="mt-4 grid gap-3">
          {filtered.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {user.full_name || "Unnamed user"}
          </div>

          <div className="truncate text-xs text-muted-foreground">
            {user.email || user.id}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold">
            {formatNumber(user.usdt_balance)} USDT
          </div>

          <KycBadge status={user.kyc_status} />
        </div>

        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition",
            open && "rotate-90",
          )}
        />
      </button>

      {open ? (
        <div className="grid gap-2 border-t border-border p-4 text-xs">
          <InfoRow label="User ID" value={user.id} copy />
          <InfoRow label="Email" value={user.email || "—"} />
          <InfoRow label="Full name" value={user.full_name || "—"} />
          <InfoRow
            label="Referral code"
            value={user.referral_code}
            copy
          />
          <InfoRow
            label="Referrals"
            value={formatNumber(user.referred_count)}
          />
          <InfoRow
            label="Referral earnings"
            value={`${formatNumber(user.referral_earnings)} USDT`}
          />
          <InfoRow
            label="Joined"
            value={formatDate(user.created_at)}
          />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Balance management                                                          */
/* -------------------------------------------------------------------------- */

function BalancePanel() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [symbol, setSymbol] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"credit" | "debit">("credit");

  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users");

      if (error) throw error;

      return (data ?? []) as AdminUser[];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error("Select a user first.");
      }

      const value = Number(amount);

      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("Enter a valid amount.");
      }

      const delta = mode === "credit" ? value : -value;

      const { data, error } = await supabase.rpc(
        "admin_adjust_balance",
        {
          _user_id: selected.id,
          _symbol: symbol.toUpperCase(),
          _delta: delta,
          _note: note.trim() || null,
        },
      );

      if (error) throw error;

      return data;
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin-users"],
      });

      qc.invalidateQueries({
        queryKey: ["admin-stats"],
      });

      setAmount("");
      setNote("");

      alert("Balance updated successfully.");
    },
  });

  const filtered = (users ?? []).filter((user) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return [
      user.email,
      user.full_name,
      user.id,
      user.referral_code,
    ]
      .filter(Boolean)
      .some((x) =>
        String(x).toLowerCase().includes(q),
      );
  });

  return (
    <div className="mt-5">
      <SectionHeading
        title="Balance management"
        description="Credit or debit a user's balance"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Find user..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {isLoading ? (
              <Loading />
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelected(user)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border p-4 text-left hover:bg-muted",
                    selected?.id === user.id &&
                      "bg-primary/5",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {user.full_name || "Unnamed"}
                    </div>

                    <div className="truncate text-xs text-muted-foreground">
                      {user.email || user.id}
                    </div>
                  </div>

                  <div className="text-xs font-semibold">
                    {formatNumber(user.usdt_balance)} USDT
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-4">
          <h3 className="font-semibold">
            Adjust balance
          </h3>

          {!selected ? (
            <div className="mt-4 rounded-xl bg-muted p-4 text-center text-xs text-muted-foreground">
              Select a user from the list.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl bg-muted p-3">
                <div className="text-xs text-muted-foreground">
                  Selected user
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {selected.full_name || selected.email}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Current USDT:{" "}
                  {formatNumber(selected.usdt_balance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("credit")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold",
                    mode === "credit"
                      ? "border-success bg-success/10 text-success"
                      : "border-border",
                  )}
                >
                  Credit
                </button>

                <button
                  type="button"
                  onClick={() => setMode("debit")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold",
                    mode === "debit"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border",
                  )}
                >
                  Debit
                </button>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium">
                  Asset
                </span>

                <input
                  value={symbol}
                  onChange={(e) =>
                    setSymbol(e.target.value.toUpperCase())
                  }
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium">
                  Amount
                </span>

                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium">
                  Admin note
                </span>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  placeholder="Reason for balance adjustment"
                  className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm outline-none"
                />
              </label>

              {mutation.error ? (
                <ErrorBox
                  message={
                    (mutation.error as Error).message
                  }
                />
              ) : null}

              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl font-semibold text-white",
                  mode === "credit"
                    ? "bg-success"
                    : "bg-destructive",
                  "disabled:opacity-50",
                )}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "credit" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}

                {mutation.isPending
                  ? "Processing..."
                  : mode === "credit"
                    ? "Credit balance"
                    : "Debit balance"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Withdrawals                                                                 */
/* -------------------------------------------------------------------------- */

function WithdrawalsPanel() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) throw error;

      return (data ?? []) as Withdrawal[];
    },
  });

  const filtered =
    filter === "all"
      ? data ?? []
      : (data ?? []).filter(
          (item) => item.status === filter,
        );

  return (
    <div className="mt-5">
      <SectionHeading
        title="Withdrawals"
        description="Review withdrawal requests"
      />

      <FilterTabs
        value={filter}
        onChange={setFilter}
        items={[
          ["pending", "Pending"],
          ["approved", "Approved"],
          ["rejected", "Rejected"],
          ["all", "All"],
        ]}
      />

      {error ? (
        <ErrorBox message={(error as Error).message} />
      ) : null}

      {isLoading ? (
        <Loading />
      ) : !filtered.length ? (
        <EmptyState message="No withdrawal requests." />
      ) : (
        <div className="mt-4 grid gap-3">
          {filtered.map((withdrawal) => (
            <WithdrawalCard
              key={withdrawal.id}
              withdrawal={withdrawal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalCard({
  withdrawal,
}: {
  withdrawal: Withdrawal;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function review(approve: boolean) {
    const message = approve
      ? "Approve this withdrawal?"
      : "Reject this withdrawal?";

    if (!window.confirm(message)) return;

    setBusy(true);

    try {
      const { error } = await supabase.rpc(
        "admin_review_withdrawal",
        {
          _id: withdrawal.id,
          _approve: approve,
          _note: note.trim() || null,
        },
      );

      if (error) throw error;

      await qc.invalidateQueries({
        queryKey: ["admin-withdrawals"],
      });

      await qc.invalidateQueries({
        queryKey: ["admin-stats"],
      });
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">
            {formatNumber(withdrawal.amount)}{" "}
            {withdrawal.symbol}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(withdrawal.created_at)}
          </div>
        </div>

        <StatusBadge status={withdrawal.status} />
      </div>

      <div className="mt-4 grid gap-2">
        <InfoRow
          label="User"
          value={withdrawal.user_id}
          copy
        />

        <InfoRow
          label="Address"
          value={withdrawal.address}
          copy
        />

        <InfoRow
          label="Source"
          value={withdrawal.source}
        />
      </div>

      {withdrawal.status === "pending" ? (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional admin note..."
            className="mt-4 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => review(false)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-xs font-bold text-destructive disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => review(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-success text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </button>
          </div>
        </>
      ) : withdrawal.admin_note ? (
        <div className="mt-4 rounded-xl bg-muted p-3 text-xs">
          <span className="font-semibold">
            Admin note:
          </span>{" "}
          {withdrawal.admin_note}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* KYC                                                                         */
/* -------------------------------------------------------------------------- */

function KycPanel() {
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) throw error;

      return (data ?? []) as KycSubmission[];
    },
  });

  const filtered =
    filter === "all"
      ? data ?? []
      : (data ?? []).filter(
          (item) => item.status === filter,
        );

  return (
    <div className="mt-5">
      <SectionHeading
        title="KYC review"
        description="Review customer verification submissions"
      />

      <FilterTabs
        value={filter}
        onChange={setFilter}
        items={[
          ["pending", "Pending"],
          ["approved", "Approved"],
          ["rejected", "Rejected"],
          ["all", "All"],
        ]}
      />

      {error ? (
        <ErrorBox message={(error as Error).message} />
      ) : null}

      {isLoading ? (
        <Loading />
      ) : !filtered.length ? (
        <EmptyState message="No KYC submissions." />
      ) : (
        <div className="mt-4 grid gap-3">
          {filtered.map((item) => (
            <KycCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function KycCard({ item }: { item: KycSubmission }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function review(approve: boolean) {
    if (
      !window.confirm(
        approve
          ? "Approve this KYC?"
          : "Reject this KYC?",
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.rpc(
        "admin_review_kyc",
        {
          _id: item.id,
          _approve: approve,
          _note: note.trim() || null,
        },
      );

      if (error) throw error;

      await qc.invalidateQueries({
        queryKey: ["admin-kyc"],
      });

      await qc.invalidateQueries({
        queryKey: ["admin-stats"],
      });

      await qc.invalidateQueries({
        queryKey: ["admin-users"],
      });
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            {item.full_name}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Submitted {formatDate(item.created_at)}
          </div>
        </div>

        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 grid gap-2">
        <InfoRow
          label="User ID"
          value={item.user_id}
          copy
        />

        <InfoRow
          label="Document"
          value={item.document_path || "Not provided"}
        />

        <InfoRow
          label="Selfie"
          value={item.selfie_path || "Not provided"}
        />
      </div>

      {item.status === "pending" ? (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional review note..."
            className="mt-4 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => review(false)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-xs font-bold text-destructive disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => review(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-success text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </button>
          </div>
        </>
      ) : item.admin_note ? (
        <div className="mt-4 rounded-xl bg-muted p-3 text-xs">
          <span className="font-semibold">
            Admin note:
          </span>{" "}
          {item.admin_note}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Investment plans                                                            */
/* -------------------------------------------------------------------------- */

function PlansPanel() {
  const qc = useQueryClient();

  const [editing, setEditing] =
    useState<InvestmentPlan | null>(null);

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [profit, setProfit] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [active, setActive] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_plans")
        .select("*")
        .order("duration_days");

      if (error) throw error;

      return (data ?? []) as InvestmentPlan[];
    },
  });

  function startEdit(plan: InvestmentPlan) {
    setEditing(plan);
    setName(plan.name);
    setDuration(String(plan.duration_days));
    setProfit(String(plan.profit_percent));
    setMin(String(plan.min_amount));
    setMax(String(plan.max_amount));
    setActive(plan.active);
  }

  function clearForm() {
    setEditing(null);
    setName("");
    setDuration("");
    setProfit("");
    setMin("");
    setMax("");
    setActive(true);
  }

  async function savePlan() {
    if (!name.trim()) {
      alert("Plan name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      duration_days: Number(duration),
      profit_percent: Number(profit),
      min_amount: Number(min),
      max_amount: Number(max),
      active,
    };

    if (
      !Number.isFinite(payload.duration_days) ||
      payload.duration_days <= 0
    ) {
      alert("Invalid duration.");
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("investment_plans")
          .update(payload)
          .eq("id", editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("investment_plans")
          .insert(payload);

        if (error) throw error;
      }

      await qc.invalidateQueries({
        queryKey: ["admin-plans"],
      });

      await qc.invalidateQueries({
        queryKey: ["plans"],
      });

      clearForm();
    } catch (error) {
      alert((error as Error).message);
    }
  }

  async function removePlan(id: string) {
    if (
      !window.confirm(
        "Delete this investment plan?",
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("investment_plans")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await qc.invalidateQueries({
      queryKey: ["admin-plans"],
    });
  }

  return (
    <div className="mt-5">
      <SectionHeading
        title="Investment plans"
        description="Create and manage investment plans"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-3">
          {error ? (
            <ErrorBox message={(error as Error).message} />
          ) : null}

          {isLoading ? (
            <Loading />
          ) : !data?.length ? (
            <EmptyState message="No plans." />
          ) : (
            data.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {plan.name}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {plan.duration_days} days ·{" "}
                      {plan.profit_percent}% profit
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-semibold",
                      plan.active
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {plan.active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <InfoRow
                    label="Minimum"
                    value={`${formatNumber(plan.min_amount)} USDT`}
                  />
                  <InfoRow
                    label="Maximum"
                    value={`${formatNumber(plan.max_amount)} USDT`}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(plan)}
                    className="h-9 flex-1 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => removePlan(plan.id)}
                    className="h-9 rounded-xl bg-destructive/10 px-4 text-xs font-semibold text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {editing ? "Edit plan" : "Create plan"}
            </h3>

            {editing ? (
              <button
                type="button"
                onClick={clearForm}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <Field
              label="Plan name"
              value={name}
              onChange={setName}
              placeholder="Starter"
            />

            <Field
              label="Duration (days)"
              value={duration}
              onChange={setDuration}
              type="number"
              placeholder="7"
            />

            <Field
              label="Profit (%)"
              value={profit}
              onChange={setProfit}
              type="number"
              placeholder="5"
            />

            <Field
              label="Minimum amount"
              value={min}
              onChange={setMin}
              type="number"
              placeholder="50"
            />

            <Field
              label="Maximum amount"
              value={max}
              onChange={setMax}
              type="number"
              placeholder="5000"
            />

            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) =>
                  setActive(e.target.checked)
                }
              />
              Active plan
            </label>

            <button
              type="button"
              onClick={savePlan}
              className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              {editing
                ? "Save changes"
                : "Create plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

function TransactionsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) throw error;

      return (data ?? []) as Transaction[];
    },
  });

  return (
    <div className="mt-5">
      <SectionHeading
        title="Transactions"
        description="Latest 100 platform transactions"
      />

      {error ? (
        <ErrorBox message={(error as Error).message} />
      ) : null}

      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <EmptyState message="No transactions." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  Date
                </th>
                <th className="px-4 py-3 font-semibold">
                  User
                </th>
                <th className="px-4 py-3 font-semibold">
                  Type
                </th>
                <th className="px-4 py-3 font-semibold">
                  Asset
                </th>
                <th className="px-4 py-3 font-semibold">
                  Amount
                </th>
                <th className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold">
                  Note
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </td>

                  <td className="px-4 py-3 font-mono text-[10px]">
                    {shortId(tx.user_id)}
                  </td>

                  <td className="px-4 py-3">
                    {tx.type}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    {tx.symbol}
                  </td>

                  <td
                    className={cn(
                      "px-4 py-3 font-bold",
                      Number(tx.amount) >= 0
                        ? "text-success"
                        : "text-destructive",
                    )}
                  >
                    {Number(tx.amount) >= 0
                      ? "+"
                      : ""}
                    {formatNumber(tx.amount)}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={tx.status}
                    />
                  </td>

                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
                    {tx.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared components                                                           */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-base font-bold">
        {title}
      </h2>

      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: typeof Wallet;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted"
    >
      <div className="rounded-xl bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {title}
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {description}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function FilterTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: [T, string][];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold",
            value === id
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function KycBadge({
  status,
}: {
  status: AdminUser["kyc_status"];
}) {
  return (
    <span
      className={cn(
        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold",
        status === "approved" &&
          "bg-success/10 text-success",
        status === "pending" &&
          "bg-warning/10 text-warning",
        status === "rejected" &&
          "bg-destructive/10 text-destructive",
        status === "none" &&
          "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const positive =
    status === "approved" ||
    status === "completed";

  const negative =
    status === "rejected" ||
    status === "failed";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize",
        positive &&
          "bg-success/10 text-success",
        negative &&
          "bg-destructive/10 text-destructive",
        !positive &&
          !negative &&
          "bg-warning/10 text-warning",
      )}
    >
      {status}
    </span>
  );
}

function InfoRow({
  label,
  value,
  copy = false,
}: {
  label: string;
  value: string | number;
  copy?: boolean;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        String(value),
      );
    } catch {
      // Ignore clipboard errors.
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="shrink-0 text-muted-foreground">
        {label}
      </span>

      <span className="flex min-w-0 items-center gap-1 text-right font-medium">
        <span className="break-all">
          {value}
        </span>

        {copy ? (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-1 hover:bg-muted"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
        ) : null}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="my-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

function formatNumber(value: number | string) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(number);
}

function formatAmount(value: number | string) {
  return `${formatNumber(value)} USDT`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function shortId(value: string) {
  if (!value) return "—";

  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
