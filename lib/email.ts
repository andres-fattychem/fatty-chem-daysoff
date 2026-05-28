import { Resend } from "resend";
import { signActionToken } from "./tokens";
import type { Request, Employee } from "./db";

const LEAVE_LABEL: Record<string, string> = {
  vacation: "Vacation / PTO",
  sick: "Sick day",
  personal: "Personal / Unpaid",
  half_day: "Half day",
  pto_paid: "PTO paid out (working)",
};

function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dateRange(r: Request): string {
  const startStr = formatDate(r.start_date);
  const endStr = formatDate(r.end_date);
  return r.start_date === r.end_date ? startStr : `${startStr} → ${endStr}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Common HTML wrapper used by every email. Provides the branded header,
 * body slot, and footer. */
function renderEmailShell(opts: {
  bodyHtml: string;
  appUrl: string;
}): string {
  return `<!doctype html><html><body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Brand header -->
        <tr><td style="background:#0A0A0A; padding:22px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:14px; vertical-align:middle;">
                <div style="width:34px; height:34px; border-radius:50%; background:#ED9221; border:3px solid #0A0A0A; box-shadow:0 0 0 2px #ED9221;"></div>
              </td>
              <td style="vertical-align:middle;">
                <div style="color:#ED9221; font-size:19px; font-weight:600; letter-spacing:-0.01em; line-height:1;">fattychem</div>
                <div style="color:#9CA3AF; font-size:9px; letter-spacing:0.25em; margin-top:4px;">DAYS OFF</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body slot -->
        ${opts.bodyHtml}

        <!-- Footer -->
        <tr><td style="background:#f9fafb; padding:14px 28px; border-top:1px solid #f1f5f9;">
          <p style="margin:0; color:#9ca3af; font-size:11px;">Sent by the Fatty Chem Days Off Planner · internal use only</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Common request-details HTML table — used in admin + employee emails. */
function renderDetailsTable(r: Request, e: Employee): string {
  return `<table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:24px; border-top:1px solid #f1f5f9;">
    <tr><td style="padding:10px 0; color:#6b7280; width:35%; border-bottom:1px solid #f1f5f9;">Employee</td><td style="padding:10px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #f1f5f9;">${escapeHtml(e.full_name)}${e.department ? `<span style="color:#9ca3af; font-weight:400;"> · ${escapeHtml(e.department)}</span>` : ""}</td></tr>
    <tr><td style="padding:10px 0; color:#6b7280; border-bottom:1px solid #f1f5f9;">Type</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${LEAVE_LABEL[r.leave_type] || r.leave_type}</td></tr>
    <tr><td style="padding:10px 0; color:#6b7280; border-bottom:1px solid #f1f5f9;">Dates</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${dateRange(r)}</td></tr>
    <tr><td style="padding:10px 0; color:#6b7280;">Days</td><td style="padding:10px 0; color:#0f172a;">${r.days_count}</td></tr>
    ${r.reason ? `<tr><td style="padding:10px 0; color:#6b7280; vertical-align:top; border-top:1px solid #f1f5f9;">Reason</td><td style="padding:10px 0; color:#0f172a; border-top:1px solid #f1f5f9;">${escapeHtml(r.reason)}</td></tr>` : ""}
  </table>`;
}

function envOrError(): {
  apiKey?: string;
  from?: string;
  appUrl?: string;
  error?: string;
} {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) {
    return {
      error:
        "Email not configured (RESEND_API_KEY / EMAIL_FROM / NEXT_PUBLIC_APP_URL missing)",
    };
  }
  return { apiKey, from, appUrl };
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Approver email — sent when a new request is created
// ─────────────────────────────────────────────────────────────────────────

export async function sendApprovalEmail(opts: {
  request: Request;
  employee: Employee;
}): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, from, appUrl, error } = envOrError();
  if (error) return { ok: false, error };
  const approverEnv = process.env.APPROVER_EMAIL;
  if (!approverEnv)
    return { ok: false, error: "APPROVER_EMAIL not configured" };

  const approvers = approverEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (approvers.length === 0)
    return { ok: false, error: "APPROVER_EMAIL is empty" };

  const resend = new Resend(apiKey!);

  const approveToken = await signActionToken(opts.request.id, "approve");
  const rejectToken = await signActionToken(opts.request.id, "reject");
  const approveUrl = `${appUrl}/decision?token=${encodeURIComponent(approveToken)}`;
  const rejectUrl = `${appUrl}/decision?token=${encodeURIComponent(rejectToken)}`;

  const body = `<tr><td style="padding:28px;">
    <h1 style="margin:0 0 6px; font-size:18px; color:#0A0A0A; font-weight:600;">New time-off request</h1>
    <p style="margin:0 0 20px; font-size:14px; color:#4b5563;">A request has been submitted and needs your approval.</p>
    ${renderDetailsTable(opts.request, opts.employee)}
    ${opts.request.created_by ? `<p style="margin:-12px 0 20px; font-size:12px; color:#9ca3af;">Requested by ${escapeHtml(opts.request.created_by)}</p>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 12px;">
      <tr>
        <td style="padding-right:10px;">
          <a href="${approveUrl}" style="display:inline-block; background:#ED9221; color:#ffffff; padding:13px 26px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">✓ Approve</a>
        </td>
        <td>
          <a href="${rejectUrl}" style="display:inline-block; background:#ffffff; color:#0A0A0A; border:1px solid #d1d5db; padding:12px 26px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px;">✕ Reject</a>
        </td>
      </tr>
    </table>
    ${
      approvers.length > 1
        ? `<div style="margin:18px 0 0; padding:12px 14px; background:#FEF5E7; border-left:3px solid #ED9221; border-radius:4px; font-size:12px; color:#7A4810; line-height:1.5;">
      <strong>Any of you can approve.</strong> This request was sent to ${approvers.length} admins — the first decision wins. The others will be notified.
    </div>`
        : ""
    }
    <p style="margin:18px 0 0; color:#9ca3af; font-size:12px; line-height:1.5;">If no action is taken and the requested date passes, this request will be automatically confirmed.</p>
    <p style="margin:10px 0 0;"><a href="${appUrl}" style="color:#ED9221; font-size:13px; font-weight:500;">Open the full schedule →</a></p>
  </td></tr>`;

  const html = renderEmailShell({ bodyHtml: body, appUrl: appUrl! });
  const text = `FATTYCHEM · DAYS OFF

New time-off request needs your approval:

Employee: ${opts.employee.full_name}${opts.employee.department ? ` (${opts.employee.department})` : ""}
Type:     ${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}
Dates:    ${dateRange(opts.request)}
Days:     ${opts.request.days_count}
${opts.request.reason ? `Reason:   ${opts.request.reason}\n` : ""}
Approve: ${approveUrl}
Reject:  ${rejectUrl}

If no action is taken before the requested date passes, the request will be auto-confirmed.`;

  try {
    await resend.emails.send({
      from: from!,
      to: approvers,
      subject: `[Days Off] ${opts.employee.full_name} — ${LEAVE_LABEL[opts.request.leave_type]} ${dateRange(opts.request)}`,
      html,
      text,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Send failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Employee email — sent when their request has been submitted
// ─────────────────────────────────────────────────────────────────────────

export async function sendRequestSubmittedEmployeeEmail(opts: {
  request: Request;
  employee: Employee;
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!opts.employee.email) return { ok: true, skipped: true };
  const { apiKey, from, appUrl, error } = envOrError();
  if (error) return { ok: false, error };
  const resend = new Resend(apiKey!);

  const body = `<tr><td style="padding:28px;">
    <h1 style="margin:0 0 6px; font-size:18px; color:#0A0A0A; font-weight:600;">Time-off request submitted</h1>
    <p style="margin:0 0 20px; font-size:14px; color:#4b5563; line-height:1.6;">Hi ${escapeHtml(opts.employee.full_name.split(" ")[0])}, a time-off request has been submitted on your behalf. You'll get another email once it's approved.</p>
    ${renderDetailsTable(opts.request, opts.employee)}
    <div style="padding:12px 14px; background:#FFF7ED; border-left:3px solid #F1A02A; border-radius:4px; font-size:13px; color:#7A4810; line-height:1.5;">
      <strong>Status: Pending approval.</strong> Please don't make travel plans until you receive the confirmation email.
    </div>
    <p style="margin:18px 0 0; font-size:12px; color:#9ca3af;">If anything looks wrong, contact your office admin.</p>
  </td></tr>`;
  const html = renderEmailShell({ bodyHtml: body, appUrl: appUrl! });
  const text = `FATTYCHEM · DAYS OFF

Hi ${opts.employee.full_name.split(" ")[0]},

A time-off request has been submitted on your behalf:

Type:  ${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}
Dates: ${dateRange(opts.request)}
Days:  ${opts.request.days_count}

Status: Pending approval. You'll receive another email once it's approved. Please don't make travel plans until then.

If anything looks wrong, contact your office admin.`;

  try {
    await resend.emails.send({
      from: from!,
      to: opts.employee.email,
      subject: `Your time-off request has been submitted — ${dateRange(opts.request)}`,
      html,
      text,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Send failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Employee email — sent when their request has been decided
// ─────────────────────────────────────────────────────────────────────────

export async function sendDecisionEmployeeEmail(opts: {
  request: Request;
  employee: Employee;
  isApproval: boolean;
  isAutoApproved?: boolean;
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!opts.employee.email) return { ok: true, skipped: true };
  const { apiKey, from, appUrl, error } = envOrError();
  if (error) return { ok: false, error };
  const resend = new Resend(apiKey!);

  const firstName = opts.employee.full_name.split(" ")[0];
  const heading = opts.isApproval
    ? opts.isAutoApproved
      ? "Time-off request confirmed"
      : "Time-off request approved"
    : "Time-off request not approved";

  const intro = opts.isApproval
    ? opts.isAutoApproved
      ? `Hi ${escapeHtml(firstName)}, your time-off request has been automatically confirmed since the requested date arrived without an objection from the office team.`
      : `Hi ${escapeHtml(firstName)}, good news — your time-off request has been approved. Enjoy!`
    : `Hi ${escapeHtml(firstName)}, unfortunately your time-off request was not approved at this time. Please speak with your office admin if you'd like more information or want to discuss alternatives.`;

  const calloutBg = opts.isApproval ? "#ECFDF5" : "#FEF2F2";
  const calloutBorder = opts.isApproval ? "#10B981" : "#DC2626";
  const calloutText = opts.isApproval ? "#065F46" : "#7F1D1D";
  const calloutMsg = opts.isApproval
    ? `<strong>Status: Confirmed${opts.isAutoApproved ? " (auto)" : ""}.</strong> See you when you're back!`
    : `<strong>Status: Rejected.</strong> No action needed on your part.`;

  const body = `<tr><td style="padding:28px;">
    <h1 style="margin:0 0 6px; font-size:18px; color:#0A0A0A; font-weight:600;">${heading}</h1>
    <p style="margin:0 0 20px; font-size:14px; color:#4b5563; line-height:1.6;">${intro}</p>
    ${renderDetailsTable(opts.request, opts.employee)}
    <div style="padding:12px 14px; background:${calloutBg}; border-left:3px solid ${calloutBorder}; border-radius:4px; font-size:13px; color:${calloutText}; line-height:1.5;">
      ${calloutMsg}
    </div>
  </td></tr>`;
  const html = renderEmailShell({ bodyHtml: body, appUrl: appUrl! });
  const text = `FATTYCHEM · DAYS OFF

${heading}

Hi ${firstName},

${opts.isApproval ? (opts.isAutoApproved ? "Your time-off request has been automatically confirmed since the requested date arrived without an objection." : "Good news — your time-off request has been approved. Enjoy!") : "Unfortunately your time-off request was not approved at this time. Please speak with your office admin for more info."}

Type:  ${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}
Dates: ${dateRange(opts.request)}
Days:  ${opts.request.days_count}
Status: ${opts.isApproval ? `Confirmed${opts.isAutoApproved ? " (auto)" : ""}` : "Rejected"}`;

  const subject = opts.isApproval
    ? `Your time-off is confirmed — ${dateRange(opts.request)}`
    : `Your time-off request was not approved — ${dateRange(opts.request)}`;

  try {
    await resend.emails.send({
      from: from!,
      to: opts.employee.email!,
      subject,
      html,
      text,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Send failed" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Other-admins FYI — sent when one admin has decided
// ─────────────────────────────────────────────────────────────────────────

export async function sendDecisionOtherAdminsEmail(opts: {
  request: Request;
  employee: Employee;
  newStatus: "confirmed" | "rejected";
  decidedVia: "email" | "in-app" | "auto";
}): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const { apiKey, from, appUrl, error } = envOrError();
  if (error) return { ok: false, error };
  const approverEnv = process.env.APPROVER_EMAIL;
  if (!approverEnv) return { ok: true, skipped: true };

  const approvers = approverEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Only send if there are 2+ approvers (otherwise no "other" admins exist)
  if (approvers.length < 2) return { ok: true, skipped: true };

  const resend = new Resend(apiKey!);

  const statusLabel = opts.newStatus === "confirmed" ? "approved" : "rejected";
  const viaLabel =
    opts.decidedVia === "email"
      ? "via email"
      : opts.decidedVia === "auto"
        ? "automatically (date passed)"
        : "via the app";

  const accentBg = opts.newStatus === "confirmed" ? "#ECFDF5" : "#FEF2F2";
  const accentBorder =
    opts.newStatus === "confirmed" ? "#10B981" : "#DC2626";
  const accentText =
    opts.newStatus === "confirmed" ? "#065F46" : "#7F1D1D";

  const body = `<tr><td style="padding:28px;">
    <h1 style="margin:0 0 6px; font-size:18px; color:#0A0A0A; font-weight:600;">Request already decided</h1>
    <p style="margin:0 0 20px; font-size:14px; color:#4b5563; line-height:1.6;">${escapeHtml(opts.employee.full_name)}'s time-off request has already been <strong>${statusLabel}</strong> ${viaLabel}. No further action is needed from you.</p>
    ${renderDetailsTable(opts.request, opts.employee)}
    <div style="padding:12px 14px; background:${accentBg}; border-left:3px solid ${accentBorder}; border-radius:4px; font-size:13px; color:${accentText}; line-height:1.5;">
      <strong>Status: ${opts.newStatus === "confirmed" ? "Confirmed" : "Rejected"}.</strong> This message is FYI only.
    </div>
    <p style="margin:18px 0 0;"><a href="${appUrl}" style="color:#ED9221; font-size:13px; font-weight:500;">Open the full schedule →</a></p>
  </td></tr>`;
  const html = renderEmailShell({ bodyHtml: body, appUrl: appUrl! });
  const text = `FATTYCHEM · DAYS OFF

FYI: ${opts.employee.full_name}'s time-off request was ${statusLabel} ${viaLabel}.

Type:  ${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}
Dates: ${dateRange(opts.request)}
Days:  ${opts.request.days_count}
Status: ${opts.newStatus === "confirmed" ? "Confirmed" : "Rejected"}

No action needed.`;

  try {
    await resend.emails.send({
      from: from!,
      to: approvers,
      subject: `[Days Off · FYI] ${opts.employee.full_name} — ${statusLabel} ${dateRange(opts.request)}`,
      html,
      text,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Send failed" };
  }
}
