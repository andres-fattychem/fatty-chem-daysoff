import { Resend } from "resend";
import { signActionToken } from "./tokens";
import type { Request, Employee } from "./db";

const LEAVE_LABEL: Record<string, string> = {
  vacation: "Vacation / PTO",
  sick: "Sick day",
  personal: "Personal / Unpaid",
  half_day: "Half day",
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

// Note: We render the logo mark in HTML/CSS instead of an embedded image.
// Outlook strips SVG and many clients block remote image loading by default;
// a CSS-only "sunburst" placeholder followed by the wordmark gets brand
// recognition across every major client. If you want the real raster logo,
// host a PNG at /public/email-logo.png and replace the inline div below.

export async function sendApprovalEmail(opts: {
  request: Request;
  employee: Employee;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const approverEnv = process.env.APPROVER_EMAIL;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !approverEnv || !from || !appUrl) {
    return {
      ok: false,
      error:
        "Email not configured (RESEND_API_KEY / APPROVER_EMAIL / EMAIL_FROM / NEXT_PUBLIC_APP_URL missing)",
    };
  }

  // APPROVER_EMAIL accepts a single address or a comma-separated list.
  // The email is sent to all of them; whichever admin clicks first wins.
  const approvers = approverEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (approvers.length === 0) {
    return { ok: false, error: "APPROVER_EMAIL is empty" };
  }

  const resend = new Resend(apiKey);

  const approveToken = await signActionToken(opts.request.id, "approve");
  const rejectToken = await signActionToken(opts.request.id, "reject");

  const approveUrl = `${appUrl}/decision?token=${encodeURIComponent(approveToken)}`;
  const rejectUrl = `${appUrl}/decision?token=${encodeURIComponent(rejectToken)}`;

  const startStr = formatDate(opts.request.start_date);
  const endStr = formatDate(opts.request.end_date);
  const dateRange =
    opts.request.start_date === opts.request.end_date
      ? startStr
      : `${startStr} → ${endStr}`;

  const html = `<!doctype html><html><body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Brand header -->
        <tr><td style="background:#0A0A0A; padding:22px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:14px; vertical-align:middle;">
                <!-- Brand mark: orange disc on black -->
                <div style="width:34px; height:34px; border-radius:50%; background:#ED9221; border:3px solid #0A0A0A; box-shadow:0 0 0 2px #ED9221;"></div>
              </td>
              <td style="vertical-align:middle;">
                <div style="color:#ED9221; font-size:19px; font-weight:600; letter-spacing:-0.01em; line-height:1;">fattychem</div>
                <div style="color:#9CA3AF; font-size:9px; letter-spacing:0.25em; margin-top:4px;">DAYS OFF</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 6px; font-size:18px; color:#0A0A0A; font-weight:600;">New time-off request</h1>
          <p style="margin:0 0 20px; font-size:14px; color:#4b5563;">A request has been submitted and needs your approval.</p>

          <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:24px; border-top:1px solid #f1f5f9;">
            <tr><td style="padding:10px 0; color:#6b7280; width:35%; border-bottom:1px solid #f1f5f9;">Employee</td><td style="padding:10px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #f1f5f9;">${escapeHtml(opts.employee.full_name)}${opts.employee.department ? `<span style="color:#9ca3af; font-weight:400;"> · ${escapeHtml(opts.employee.department)}</span>` : ""}</td></tr>
            <tr><td style="padding:10px 0; color:#6b7280; border-bottom:1px solid #f1f5f9;">Type</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}</td></tr>
            <tr><td style="padding:10px 0; color:#6b7280; border-bottom:1px solid #f1f5f9;">Dates</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${dateRange}</td></tr>
            <tr><td style="padding:10px 0; color:#6b7280; border-bottom:1px solid #f1f5f9;">Days</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${opts.request.days_count}</td></tr>
            ${opts.request.reason ? `<tr><td style="padding:10px 0; color:#6b7280; vertical-align:top; border-bottom:1px solid #f1f5f9;">Reason</td><td style="padding:10px 0; color:#0f172a; border-bottom:1px solid #f1f5f9;">${escapeHtml(opts.request.reason)}</td></tr>` : ""}
            ${opts.request.created_by ? `<tr><td style="padding:10px 0; color:#6b7280;">Requested by</td><td style="padding:10px 0; color:#0f172a;">${escapeHtml(opts.request.created_by)}</td></tr>` : ""}
          </table>

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
            <strong>Any of you can approve.</strong> This request was sent to ${approvers.length} admins — the first decision wins. Subsequent clicks will show the existing answer.
          </div>`
              : ""
          }
          <p style="margin:18px 0 0; color:#9ca3af; font-size:12px; line-height:1.5;">If no action is taken and the requested date passes, this request will be automatically confirmed.</p>
          <p style="margin:10px 0 0;"><a href="${appUrl}" style="color:#ED9221; font-size:13px; font-weight:500;">Open the full schedule →</a></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb; padding:14px 28px; border-top:1px solid #f1f5f9;">
          <p style="margin:0; color:#9ca3af; font-size:11px;">Sent by the Fatty Chem Days Off Planner · internal use only</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `FATTYCHEM · DAYS OFF

New time-off request needs your approval:

Employee: ${opts.employee.full_name}${opts.employee.department ? ` (${opts.employee.department})` : ""}
Type:     ${LEAVE_LABEL[opts.request.leave_type] || opts.request.leave_type}
Dates:    ${dateRange}
Days:     ${opts.request.days_count}
${opts.request.reason ? `Reason:   ${opts.request.reason}\n` : ""}
Approve: ${approveUrl}
Reject:  ${rejectUrl}
${
  approvers.length > 1
    ? `\nThis request was sent to ${approvers.length} admins. The first decision wins — subsequent clicks will show the existing answer.\n`
    : ""
}
If no action is taken before the requested date passes, the request will be auto-confirmed.`;

  try {
    await resend.emails.send({
      from,
      to: approvers,
      subject: `[Days Off] ${opts.employee.full_name} — ${LEAVE_LABEL[opts.request.leave_type]} ${dateRange}`,
      html,
      text,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Send failed" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
