import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendDecisionEmployeeEmail,
  sendDecisionOtherAdminsEmail,
} from "@/lib/email";

/**
 * Daily cron job: convert any "pending" request whose start date is in the past
 * into "confirmed" (auto-approved). For each one auto-approved, notify the
 * employee and the other admins.
 *
 * Vercel calls this on the schedule defined in vercel.json. Protected by
 * CRON_SECRET (Vercel adds the header).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const ok = expected && authHeader === `Bearer ${expected}`;
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find candidates first so we can send notifications per row.
  const { rows } = await db().execute({
    sql: `SELECT r.*, e.id AS emp_id, e.full_name AS emp_full_name, e.email AS emp_email,
                 e.department AS emp_department, e.annual_pto_days AS emp_pto,
                 e.active AS emp_active
          FROM requests r JOIN employees e ON e.id = r.employee_id
          WHERE r.status = 'pending' AND r.start_date < date('now')`,
    args: [],
  });

  if (rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Flip them all to confirmed in one statement
  await db().execute({
    sql: `UPDATE requests
            SET status = 'confirmed',
                decided_at = datetime('now'),
                decided_by = 'auto-approved (date passed)',
                auto_approved = 1
            WHERE status = 'pending'
              AND start_date < date('now')`,
    args: [],
  });

  // Notifications — sent best-effort, failures don't block the cron success.
  const notificationPromises: Promise<any>[] = [];
  for (const r of rows as any[]) {
    const reqLike = {
      id: r.id,
      employee_id: r.employee_id,
      leave_type: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      days_count: r.days_count,
      reason: r.reason,
      status: "confirmed",
      created_by: r.created_by,
      created_at: r.created_at,
      decided_at: r.decided_at,
      decided_by: r.decided_by,
      auto_approved: 1,
    };
    const employee = {
      id: r.emp_id,
      full_name: r.emp_full_name,
      email: r.emp_email,
      department: r.emp_department,
      annual_pto_days: r.emp_pto,
      active: r.emp_active,
      created_at: "",
    };
    notificationPromises.push(
      sendDecisionEmployeeEmail({
        request: reqLike as any,
        employee: employee as any,
        isApproval: true,
        isAutoApproved: true,
      }),
      sendDecisionOtherAdminsEmail({
        request: reqLike as any,
        employee: employee as any,
        newStatus: "confirmed",
        decidedVia: "auto",
      })
    );
  }

  await Promise.allSettled(notificationPromises);

  return NextResponse.json({ updated: rows.length });
}
