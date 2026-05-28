import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { calculatePtoDays } from "@/lib/pto";

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
  const { full_name, email, department, start_date, annual_pto_days } =
    body || {};
  if (!full_name || typeof full_name !== "string") {
    return NextResponse.json(
      { error: "full_name required" },
      { status: 400 }
    );
  }

  // If a start_date was provided, derive annual_pto_days from the tier rule.
  // Otherwise fall back to the explicit value (or default 5).
  const ptoDays = start_date
    ? calculatePtoDays(start_date)
    : Number.isFinite(annual_pto_days)
      ? annual_pto_days
      : 5;

  const result = await db().execute({
    sql: "INSERT INTO employees (full_name, email, department, start_date, annual_pto_days) VALUES (?,?,?,?,?)",
    args: [
      full_name,
      email || null,
      department || null,
      start_date || null,
      ptoDays,
    ],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}
