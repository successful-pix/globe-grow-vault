import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type TicketMessage = Database["public"]["Tables"]["support_messages"]["Row"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

export const TICKET_CATEGORIES = [
  "General",
  "Account",
  "KYC",
  "Payments",
  "Transfers",
  "Security",
  "Technical",
] as const;

export const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"];
export const TICKET_STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];

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
  category: string;
  priority?: TicketPriority;
  message: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: params.subject.trim(),
      category: params.category,
      priority: params.priority ?? "normal",
      status: "open",
    })
    .select()
    .single();
  if (error) throw error;

  const { error: messageError } = await supabase.from("support_messages").insert({
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
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTicket(ticketId: string) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendTicketMessage(ticketId: string, message: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  const text = message.trim();
  if (!text) throw new Error("Message cannot be empty.");

  const { data, error } = await supabase
    .from("support_messages")
    .insert({ ticket_id: ticketId, sender_id: user.id, message: text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicket(
  ticketId: string,
  patch: { status?: TicketStatus; priority?: TicketPriority },
) {
  const { data, error } = await supabase
    .from("support_tickets")
    .update(patch)
    .eq("id", ticketId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-success/40 bg-success/10 text-success",
  pending: "border-warning/40 bg-warning/10 text-warning",
  resolved: "border-primary/40 bg-primary/10 text-primary",
  closed: "border-border bg-muted text-muted-foreground",
};

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "border-border bg-muted text-muted-foreground",
  normal: "border-primary/30 bg-primary/10 text-primary",
  high: "border-warning/40 bg-warning/10 text-warning",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
};
