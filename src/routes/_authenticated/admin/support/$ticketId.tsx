import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getTicket,
  getTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
} from "@/lib/support";

export const Route = createFileRoute(
  "/_authenticated/admin/support/$ticketId",
)({
  component: AdminTicket,
});

function AdminTicket() {
  const { ticketId } = Route.useParams();

  const [ticket, setTicket] =
    useState<any>(null);

  const [messages, setMessages] =
    useState<any[]>([]);

  const [message, setMessage] =
    useState("");

  const [adminId, setAdminId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "You must be signed in.",
      );
    }

    setAdminId(user.id);

    const [ticketData, messagesData] =
      await Promise.all([
        getTicket(ticketId),
        getTicketMessages(ticketId),
      ]);

    setTicket(ticketData);
    setMessages(messagesData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [ticketId]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setMessages((current) => {
            if (
              current.some(
                (item) =>
                  item.id ===
                  payload.new.id,
              )
            ) {
              return current;
            }

            return [
              ...current,
              payload.new,
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          setTicket(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (!message.trim()) return;

    setSending(true);

    try {
      await sendTicketMessage(
        ticketId,
        message,
      );

      setMessage("");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(
    status:
      | "open"
      | "pending"
      | "resolved"
      | "closed",
  ) {
    try {
      const updated =
        await updateTicketStatus(
          ticketId,
          status,
        );

      setTicket(updated);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to update ticket.",
      );
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-10 text-center">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto w-full max-w-6xl p-5">
          <Link
            to="/admin/support"
            className="text-sm text-gray-500"
          >
            ← Support Center
          </Link>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {ticket.subject}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {ticket.category} ·{" "}
                {ticket.priority}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  changeStatus("open")
                }
                className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700"
              >
                Open
              </button>

              <button
                onClick={() =>
                  changeStatus("pending")
                }
                className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-700"
              >
                Pending
              </button>

              <button
                onClick={() =>
                  changeStatus("resolved")
                }
                className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700"
              >
                Resolve
              </button>

              <button
                onClick={() =>
                  changeStatus("closed")
                }
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4">
        <div className="flex-1 overflow-y-auto rounded-2xl border bg-white p-5">
          <div className="space-y-4">
            {messages.map((item) => {
              const mine =
                item.sender_id === adminId;

              return (
                <div
                  key={item.id}
                  className={`flex ${
                    mine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      mine
                        ? "bg-black text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold opacity-70">
                      {mine
                        ? "Support"
                        : "Customer"}
                    </div>

                    <p className="whitespace-pre-wrap text-sm">
                      {item.message}
                    </p>

                    <div className="mt-1 text-[10px] opacity-60">
                      {new Date(
                        item.created_at,
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        </div>

        {ticket.status !== "closed" && (
          <form
            onSubmit={handleSend}
            className="mt-4 flex gap-3"
          >
            <input
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Reply to customer..."
              className="flex-1 rounded-xl border bg-white px-4 py-3"
            />

            <button
              disabled={
                sending || !message.trim()
              }
              className="rounded-xl bg-black px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {sending ? "..." : "Reply"}
            </button>
          </form>
        )}

        {ticket.status === "closed" && (
          <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center text-sm text-gray-600">
            This ticket is closed.
          </div>
        )}
      </main>
    </div>
  );
}
