import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { businessDaysInclusive } from "@/lib/dates";
import {
  sendApprovalEmail,
  sendRequestSubmittedEmployeeEmail,
} from "@/lib/email";

export async function GET(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const year = url.searchParams.get("year");
  const employeeId = url.searchParams.get("employee_id");

  const wheres: string[] = [];
  const args: any[] = [];
  if (status) {
    wheres.push("r.status = ?");
    args.push(status);
  }
  if (year) {
    wheres.push("substr(r.start_date,1,4) = ?");
    args.push(year);
  }
  if (employeeId) {
    wheres.push("r.employee_id = ?");
    args.push(Number(employeeId));
  }
  const sql = `
    SELECT r.*, e.full_name AS employee_name, e.department AS employee_department, e.annual_pto_days
    FROM requests r
    JOIN employees e ON e.id = r.employee_id
    ${wheres.length ? "WHERE " + wheres.join(" AND ") : ""}
    ORDER BY r.start_date DESC, r.created_at DESC
  `;
  const { rows } = await db().execute({ sql, args });
  return NextResponse.json({ requests: rows });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    employee_id,
    leave_type,
    start_date,
    end_date,
    reason,
    created_by,
  } = body || {};

  if (!employee_id || !leave_type || !start_date || !end_date) {
    return NextResponse.json(
      { error: "employee_id, leave_type, start_date, end_date required" },
      { status: 400 }
    );
  }
  const validTypes = ["vacation", "sick", "personal", "half_day", "pto_paid"];
  if (!validTypes.includes(leave_type)) {
    return NextResponse.json({ error: "Invalid leave_type" }, { status: 400 });
  }

  let days_count: number;
  if (leave_type === "half_day") {
    if (start_date !== end_date) {
      return NextResponse.json(
        { error: "Half-day must be a single date" },
        { status: 400 }
      );
    }
    days_count = 0.5;
  } else {
    // pto_paid uses business-day counting same as vacation — it's just that
    // the employee is at work on those days (calendar excludes them).
    days_count = businessDaysInclusive(start_date, end_date);
    if (days_count === 0) {
      return NextResponse.json(
        { error: "Date range contains no business days" },
        { status: 400 }
      );
    }
  }

  // Insert
  const insertResult = await db().execute({
    sql: `INSERT INTO requests
      (employee_id, leave_type, start_date, end_date, days_count, reason, created_by, status)
      VALUES (?,?,?,?,?,?,?, 'pending')`,
    args: [
      Number(employee_id),
      leave_type,
      start_date,
      end_date,
      days_count,
      reason || null,
      created_by || null,
    ],
  });

  const newId = Number(insertResult.lastInsertRowid);

  // Fetch the full row + employee for email
  const { rows } = await db().execute({
    sql: "SELECT * FROM requests WHERE id = ?",
    args: [newId],
  });
  const reqRow = rows[0] as any;

  const empRes = await db().execute({
    sql: "SELECT * FROM employees WHERE id = ?",
    args: [Number(employee_id)],
  });
  const employee = empRes.rows[0] as any;

  // Send approver email + employee notification in parallel
  const [approverResult, employeeResult] = await Promise.all([
    sendApprovalEmail({ request: reqRow, employee }),
    sendRequestSubmittedEmployeeEmail({ request: reqRow, employee }),
  ]);

  return NextResponse.json({
    id: newId,
    email_sent: approverResult.ok,
    email_error: approverResult.error,
    employee_notified: employeeResult.ok && !employeeResult.skipped,
  });
}
