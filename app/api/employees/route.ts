import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await db().execute(
    "SELECT * FROM employees ORDER BY full_name"
  );
  return NextResponse.json({ employees: rows });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { full_name, email, department, annual_pto_days } = body || {};
  if (!full_name || typeof full_name !== "string") {
    return NextResponse.json(
      { error: "full_name required" },
      { status: 400 }
    );
  }
  const result = await db().execute({
    sql: "INSERT INTO employees (full_name, email, department, annual_pto_days) VALUES (?,?,?,?)",
    args: [
      full_name,
      email || null,
      department || null,
      Number.isFinite(annual_pto_days) ? annual_pto_days : 20,
    ],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}
