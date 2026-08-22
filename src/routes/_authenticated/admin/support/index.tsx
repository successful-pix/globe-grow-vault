import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated/admin/support",
)({
  component: AdminSupport,
});

function AdminSupport() {
  const [tickets, setTickets] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("all");

  const [error, setError] =
    useState("");

  async function loadTickets() {
    try {
      setLoading(true);

      const { data, error } =
        await supabase
          .from("support_tickets")
          .select("*")
          .order("updated_at", {
            ascending: false,
          });

      if (error) throw error;

      setTickets(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load support tickets.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          loadTickets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTickets =
    filter === "all"
      ? tickets
      : tickets.filter(
          (ticket) =>
            ticket.status === filter,
        );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div>
          <h1 className="text-3xl font-bold">
            Support Center
          </h1>

          <p className="mt-1 text-gray-600">
            Manage customer support requests.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["open", "Open"],
            ["pending", "Pending"],
            ["resolved", "Resolved"],
            ["closed", "Closed"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setFilter(value)
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === value
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
          {loading ? (
            <div className="p-10 text-center">
              Loading...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No tickets found.
            </div>
          ) : (
            <div className="divide-y">
              {filteredTickets.map(
                (ticket) => (
                  <Link
                    key={ticket.id}
                    to="/admin/support/$ticketId"
                    params={{
                      ticketId: ticket.id,
                    }}
                    className="block p-5 hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="font-semibold">
                          {ticket.subject}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {ticket.category}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(
                            ticket.updated_at,
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                          {ticket.priority}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            ticket.status ===
                            "open"
                              ? "bg-green-100 text-green-700"
                              : ticket.status ===
                                  "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
