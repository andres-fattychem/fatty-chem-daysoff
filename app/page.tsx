import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";
import Calendar, { CalendarRequest } from "@/components/Calendar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isAdmin())) redirect("/login");

  // Load this year's requests for the calendar
  const year = String(new Date().getFullYear());
  const { rows } = await db().execute({
    sql: `SELECT r.id, r.employee_id, r.leave_type, r.start_date, r.end_date,
                 r.status, e.full_name AS employee_name
          FROM requests r JOIN employees e ON e.id = r.employee_id
          WHERE substr(r.start_date,1,4) >= ?
          ORDER BY r.start_date`,
    args: [String(Number(year) - 1)],
  });
  const requests = rows as unknown as CalendarRequest[];

  // Pending requests count for banner
  const { rows: pendingRows } = await db().execute({
    sql: `SELECT COUNT(*) AS c FROM requests WHERE status = 'pending'`,
    args: [],
  });
  const pendingCount = Number((pendingRows[0] as any).c);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
            <p className="text-sm text-slate-500">
              {pendingCount > 0 ? (
                <>
                  <Link href="/requests?status=pending" className="text-brand hover:underline">
                    {pendingCount} request{pendingCount === 1 ? "" : "s"} pending approval
                  </Link>
                </>
              ) : (
                "No pending requests."
              )}
            </p>
          </div>
          <Link
            href="/requests/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium"
          >
            + New request
          </Link>
        </div>
        <Calendar requests={requests} />
      </main>
    </div>
  );
}
