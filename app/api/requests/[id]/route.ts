import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

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

  await db().execute({
    sql: `UPDATE requests SET status = ?, decided_at = datetime('now'), decided_by = ?, auto_approved = 0 WHERE id = ?`,
    args: [status, decided_by || "admin (in-app)", id],
  });
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
