import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentUser,
  getTicket,
  getTicketMessages,
  sendTicketMessage,
} from "@/lib/support";

export const Route = createFileRoute(
  "/_authenticated/support/$ticketId",
)({
  component: SupportChat,
});

function SupportChat() {
  const { ticketId } = Route.useParams();

  const [ticket, setTicket] =
    useState<any>(null);

  const [messages, setMessages] =
    useState<any[]>([]);

  const [message, setMessage] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const user = await getCurrentUser();

      if (!user) {
        throw new Error(
          "You must be signed in.",
        );
      }

      setUserId(user.id);

      const [ticketData, messagesData] =
        await Promise.all([
          getTicket(ticketId),
          getTicketMessages(ticketId),
        ]);

      setTicket(ticketData);
      setMessages(messagesData ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [ticketId]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-ticket-${ticketId}`)
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
            const exists = current.some(
              (item) =>
                item.id === payload.new.id,
            );

            if (exists) return current;

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

    const text = message.trim();

    if (!text || sending) return;

    setSending(true);

    try {
      await sendTicketMessage(
        ticketId,
        text,
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading support chat...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto w-full max-w-5xl p-5">
          <Link
            to="/support"
            className="text-sm text-gray-500"
          >
            ← Back to Support
          </Link>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {ticket.subject}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {ticket.category}
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {ticket.status}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4">
        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-white p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No messages yet.
            </div>
          ) : (
            messages.map((item) => {
              const mine =
                item.sender_id === userId;

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
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">
                      {item.message}
                    </p>

                    <p
                      className={`mt-1 text-[10px] ${
                        mine
                          ? "text-gray-300"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(
                        item.created_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
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
              placeholder="Write a message..."
              className="flex-1 rounded-xl border bg-white px-4 py-3 outline-none"
            />

            <button
              disabled={
                sending || !message.trim()
              }
              className="rounded-xl bg-black px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </form>
        )}

        {ticket.status === "closed" && (
          <div className="mt-4 rounded-xl bg-gray-100 p-4 text-center text-sm text-gray-600">
            This support request has been closed.
          </div>
        )}
      </main>
    </div>
  );
}
