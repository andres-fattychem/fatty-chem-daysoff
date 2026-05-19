import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

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
  const fields: string[] = [];
  const args: any[] = [];

  for (const key of ["full_name", "email", "department", "annual_pto_days", "active"]) {
    if (key in body) {
      fields.push(`${key} = ?`);
      args.push(body[key]);
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
