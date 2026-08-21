import { supabase } from "@/integrations/supabase/client";

export type TicketStatus =
  | "open"
  | "pending"
  | "resolved"
  | "closed";

export type TicketPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type TicketCategory =
  | "General"
  | "Account"
  | "KYC"
  | "Payments"
  | "Transfers"
  | "Security"
  | "Technical";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

export async function createTicket(params: {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data: ticket, error: ticketError } =
    await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: params.subject,
        category: params.category,
        priority: params.priority ?? "normal",
        status: "open",
      })
      .select()
      .single();

  if (ticketError) throw ticketError;

  const { error: messageError } =
    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      message: params.message.trim(),
    });

  if (messageError) throw messageError;

  return ticket;
}

export async function getMyTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}

export async function getTicket(ticketId: string) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error) throw error;

  return data;
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", {
      ascending: true,
    });

  if (error) throw error;

  return data;
}

export async function sendTicketMessage(
  ticketId: string,
  message: string,
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const text = message.trim();

  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message: text,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      status,
    })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;

  return data;
}
