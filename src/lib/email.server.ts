import { Resend } from "resend";

const BRAND = "International Digital Support";

export type SupportEmailKind = "new_ticket" | "admin_reply" | "status_change";

type SupportEmailInput = {
  to: string;
  kind: SupportEmailKind;
  ticketId: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  preview?: string;
  ticketUrl: string;
};

function layout(opts: {
  heading: string;
  intro: string;
  body: SupportEmailInput;
}) {
  const { heading, intro, body } = opts;
  const preview = body.preview
    ? `<div style="margin:20px 0;padding:16px 18px;background:#f5f7fa;border-left:3px solid #1f6feb;border-radius:8px;color:#111827;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
        body.preview.slice(0, 500),
      )}</div>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#0f141b;font-family:'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 28px;background:#0f141b;color:#ffffff">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.2px">International Digital</div>
        <div style="font-size:12px;opacity:.7;margin-top:2px">Support</div>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 8px;font-size:20px;color:#0f141b">${escapeHtml(heading)}</h1>
        <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6">${escapeHtml(intro)}</p>
        ${preview}
        <table role="presentation" width="100%" style="margin:20px 0;font-size:13px;color:#374151">
          <tr><td style="padding:4px 0;color:#6b7280">Subject</td><td align="right"><strong>${escapeHtml(body.subject)}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Category</td><td align="right">${escapeHtml(body.category)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Priority</td><td align="right">${escapeHtml(body.priority)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Status</td><td align="right">${escapeHtml(body.status)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Ticket ID</td><td align="right" style="font-family:monospace;font-size:12px">${escapeHtml(body.ticketId)}</td></tr>
        </table>
        <a href="${escapeHtml(body.ticketUrl)}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600">Open support ticket</a>
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f5f7fa;color:#6b7280;font-size:11px">
        You are receiving this email because of activity on your International Digital support request.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSupportEmail(input: SupportEmailInput) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return { sent: false, reason: "missing_api_key" as const };

  const from =
    process.env["RESEND_FROM_EMAIL"] ?? "support@internationaldigital.online";

  const config = {
    new_ticket: {
      subject: `New support request: ${input.subject}`,
      heading: "New support request",
      intro: "A customer has opened a new support request.",
    },
    admin_reply: {
      subject: `Reply to your support request: ${input.subject}`,
      heading: "You have a new reply",
      intro: "Our support team has replied to your request.",
    },
    status_change: {
      subject: `Support request updated: ${input.subject}`,
      heading: `Your request is now ${input.status}`,
      intro: "The status of your support request has changed.",
    },
  }[input.kind];

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: `${BRAND} <${from}>`,
    to: [input.to],
    subject: config.subject,
    html: layout({ heading: config.heading, intro: config.intro, body: input }),
  });

  if (error) {
    console.error("Resend error", error);
    return { sent: false, reason: "provider_error" as const };
  }

  return { sent: true as const };
}

export function supportInbox() {
  return (
    process.env["SUPPORT_INBOX_EMAIL"] ??
    process.env["RESEND_FROM_EMAIL"] ??
    "support@internationaldigital.online"
  );
}
