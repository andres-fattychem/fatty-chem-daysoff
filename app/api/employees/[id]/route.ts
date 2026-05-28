import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { calculatePtoDays } from "@/lib/pto";

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

  // If start_date is being set or changed, derive annual_pto_days from the
  // tier rule. The admin can still override annual_pto_days explicitly if
  // they pass it (rare — e.g. for a negotiated extra-PTO contract).
  let patch: Record<string, any> = { ...body };
  if ("start_date" in body && body.start_date) {
    patch.annual_pto_days = calculatePtoDays(body.start_date);
  }

  const fields: string[] = [];
  const args: any[] = [];
  for (const key of [
    "full_name",
    "email",
    "department",
    "start_date",
    "annual_pto_days",
    "active",
  ]) {
    if (key in patch) {
      fields.push(`${key} = ?`);
      args.push(patch[key]);
    }
  }
  if (fields.length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  args.push(id);
  await db().execute({
    sql: `UPDATE employees SET ${fields.join(", ")} WHERE id = ?`,
    args,
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
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  // Soft-delete: mark inactive (preserves history)
  await db().execute({
    sql: "UPDATE employees SET active = 0 WHERE id = ?",
    args: [id],
  });
  return NextResponse.json({ ok: true });
}
