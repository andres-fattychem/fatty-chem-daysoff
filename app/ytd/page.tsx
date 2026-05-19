import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function YTDPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  if (!(await isAdmin())) redirect("/login");

  const now = new Date();
  const year = searchParams.year || String(now.getFullYear());

  // Per-employee totals by leave_type for the year, counting only confirmed requests.
  const { rows } = await db().execute({
    sql: `
      SELECT
        e.id,
        e.full_name,
        e.department,
        e.annual_pto_days,
        e.active,
        COALESCE(SUM(CASE WHEN r.leave_type IN ('vacation','half_day') AND r.status='confirmed' THEN r.days_count END), 0) AS vacation_days,
        COALESCE(SUM(CASE WHEN r.leave_type = 'sick' AND r.status='confirmed' THEN r.days_count END), 0) AS sick_days,
        COALESCE(SUM(CASE WHEN r.leave_type = 'personal' AND r.status='confirmed' THEN r.days_count END), 0) AS personal_days,
        COALESCE(SUM(CASE WHEN r.status='pending' THEN r.days_count END), 0) AS pending_days
      FROM employees e
      LEFT JOIN requests r
        ON r.employee_id = e.id
        AND substr(r.start_date, 1, 4) = ?
      GROUP BY e.id, e.full_name, e.department, e.annual_pto_days, e.active
      ORDER BY e.active DESC, e.full_name
    `,
    args: [year],
  });

  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              YTD Report — {year}
            </h1>
            <p className="text-sm text-slate-500">
              Days taken per employee. Vacation column counts confirmed
              vacation + half-day requests against the annual PTO bucket.
            </p>
          </div>
          <div className="flex gap-2">
            {years.map((y) => (
              <Link
                key={y}
                href={`/ytd?year=${y}`}
                className={`text-sm px-3 py-1.5 rounded-full border ${
                  String(y) === year
                    ? "bg-brand text-white border-brand"
                    : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Employee</th>
                <th className="text-right px-4 py-3 font-medium">
                  Vacation used
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  Annual PTO
                </th>
                <th className="text-right px-4 py-3 font-medium">Remaining</th>
                <th className="text-right px-4 py-3 font-medium">Sick</th>
                <th className="text-right px-4 py-3 font-medium">Personal</th>
                <th className="text-right px-4 py-3 font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-slate-500 py-8"
                  >
                    No employees yet. Add some on the Employees page.
                  </td>
                </tr>
              )}
              {rows.map((row: any) => {
                const remaining = row.annual_pto_days - row.vacation_days;
                const remainingClass =
                  remaining < 0
                    ? "text-red-700 font-semibold"
                    : remaining < 3
                      ? "text-amber-700 font-medium"
                      : "text-slate-700";
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      row.active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {row.full_name}
                        {!row.active && (
                          <span className="ml-2 text-xs text-slate-400">
                            (inactive)
                          </span>
                        )}
                      </div>
                      {row.department && (
                        <div className="text-xs text-slate-500">
                          {row.department}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.vacation_days}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {row.annual_pto_days}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${remainingClass}`}
                    >
                      {remaining}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.sick_days}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.personal_days}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                      {row.pending_days || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
