import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import {
  sendDecisionEmployeeEmail,
  sendDecisionOtherAdminsEmail,
} from "@/lib/email";

// PATCH: in-app approve/reject/cancel by logged-in admin
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { status, decided_by } = body || {};
  const allowed = ["pending", "confirmed", "rejected", "cancelled"];
  if (!allowed.includes(status))
    return NextResponse.json({ error: "Bad status" }, { status: 400 });

  // Get current state before mutating so we can decide whether notifications
  // are warranted (only when status actually transitions to confirmed/rejected
  // from pending).
  const before = await db().execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [id],
  });
  const beforeRow: any = before.rows[0];
  const wasPending = beforeRow?.status === "pending";

  await db().execute({
    sql: `UPDATE requests SET status = ?, decided_at = datetime('now'), decided_by = ?, auto_approved = 0 WHERE id = ?`,
    args: [status, decided_by || "admin (in-app)", id],
  });

  // Notify if a pending request just got decided (approved or rejected).
  // We AWAIT the promises here — fire-and-forget gets killed when Vercel's
  // serverless function shuts down after the response is sent.
  if (
    wasPending &&
    (status === "confirmed" || status === "rejected") &&
    beforeRow
  ) {
    const empRes = await db().execute({
      sql: "SELECT * FROM employees WHERE id = ?",
      args: [beforeRow.employee_id],
    });
    const employee: any = empRes.rows[0];
    if (employee) {
      const updatedReq = { ...beforeRow, status };
      await Promise.allSettled([
        sendDecisionEmployeeEmail({
          request: updatedReq,
          employee,
          isApproval: status === "confirmed",
        }),
        sendDecisionOtherAdminsEmail({
          request: updatedReq,
          employee,
          newStatus: status,
          decidedVia: "in-app",
        }),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  await db().execute({ sql: "DELETE FROM requests WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
