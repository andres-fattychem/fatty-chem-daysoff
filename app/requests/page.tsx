import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";
import RequestsTable from "./RequestsTable";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["all", "pending", "confirmed", "rejected", "cancelled"];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  if (!(await isAdmin())) redirect("/login");

  const status = VALID_STATUS.includes(searchParams.status || "")
    ? searchParams.status
    : "all";

  const wheres: string[] = [];
  const args: any[] = [];
  if (status && status !== "all") {
    wheres.push("r.status = ?");
    args.push(status);
  }
  const sql = `SELECT r.*, e.full_name AS employee_name, e.department AS employee_department
               FROM requests r JOIN employees e ON e.id = r.employee_id
               ${wheres.length ? "WHERE " + wheres.join(" AND ") : ""}
               ORDER BY r.start_date DESC, r.created_at DESC`;
  const { rows } = await db().execute({ sql, args });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
            <p className="text-sm text-slate-500">
              View, approve, or reject requests.
            </p>
          </div>
          <Link
            href="/requests/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium"
          >
            + New request
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "pending", "confirmed", "rejected", "cancelled"] as const).map(
            (s) => (
              <Link
                key={s}
                href={`/requests${s === "all" ? "" : `?status=${s}`}`}
                className={`text-sm px-3 py-1.5 rounded-full border ${
                  status === s
                    ? "bg-brand text-white border-brand"
                    : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            )
          )}
        </div>

        <RequestsTable requests={rows as any} />
      </main>
    </div>
  );
}
