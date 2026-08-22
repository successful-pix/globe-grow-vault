import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createTicket,
  getMyTickets,
} from "@/lib/support";

export const Route = createFileRoute(
  "/_authenticated/support/",
)({
  component: SupportPage,
});

function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState("General");

  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      setLoading(true);

      const data = await getMyTickets();

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

  async function handleCreateTicket(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      await createTicket({
        subject,
        category: category as any,
        message,
      });

      setSubject("");
      setMessage("");
      setCategory("General");

      setShowCreate(false);

      await loadTickets();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create support ticket.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Support
            </h1>

            <p className="mt-1 text-gray-600">
              Get help from our support team.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-black px-5 py-3 font-medium text-white"
          >
            New support request
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5">
            <h2 className="font-semibold">
              Your support requests
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-semibold">
                No support requests
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Need help? Create a support request.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to="/support/$ticketId"
                  params={{
                    ticketId: ticket.id,
                  }}
                  className="block p-5 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {ticket.subject}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {ticket.category} ·{" "}
                        {new Date(
                          ticket.updated_at,
                        ).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                        ticket.status === "open"
                          ? "bg-green-100 text-green-700"
                          : ticket.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                New support request
              </h2>

              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateTicket}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Subject
                </label>

                <input
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  required
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option>General</option>
                  <option>Account</option>
                  <option>KYC</option>
                  <option>Payments</option>
                  <option>Transfers</option>
                  <option>Security</option>
                  <option>Technical</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Message
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  required
                  rows={6}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Describe your issue..."
                />
              </div>

              <button
                disabled={submitting}
                className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {submitting
                  ? "Creating..."
                  : "Create support request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
