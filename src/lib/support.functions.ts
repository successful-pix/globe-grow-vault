import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  ticketId: z.string().uuid(),
  kind: z.enum(["new_ticket", "admin_reply", "status_change"]),
  preview: z.string().max(2000).optional(),
});

export const notifySupportEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .select("id, subject, category, priority, status, user_id")
      .eq("id", data.ticketId)
      .maybeSingle();

    if (error || !ticket) return { sent: false, reason: "not_found" as const };

    const origin =
      getRequestHeader("origin") ??
      (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "");

    const { sendSupportEmail, supportInbox } = await import("./email.server");

    let to = supportInbox();
    let ticketUrl = `${origin}/admin/support/${ticket.id}`;

    if (data.kind !== "new_ticket") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", ticket.user_id)
        .maybeSingle();

      if (!profile?.email) return { sent: false, reason: "no_recipient" as const };
      to = profile.email;
      ticketUrl = `${origin}/support/${ticket.id}`;
    }

    return sendSupportEmail({
      to,
      kind: data.kind,
      ticketId: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      ...(data.preview ? { preview: data.preview } : {}),
      ticketUrl,
    });
  });
