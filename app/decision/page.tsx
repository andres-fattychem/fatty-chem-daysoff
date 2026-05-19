import { verifyActionToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import Link from "next/link";
import { FattyChemMark } from "@/components/Logo";

type Search = { token?: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "still pending",
  confirmed: "already confirmed",
  rejected: "already rejected",
  cancelled: "cancelled",
};

function formatDecidedAt(iso: string | null): string {
  if (!iso) return "";
  // SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC. Display in user's locale.
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DecisionPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const token = searchParams.token;
  if (!token)
    return Result({ ok: false, title: "Couldn't process this link", message: "Missing token." });

  const payload = await verifyActionToken(token);
  if (!payload)
    return Result({
      ok: false,
      title: "Couldn't process this link",
      message: "This link is invalid or has expired.",
    });

  const { rid, act } = payload;
  const newStatus = act === "approve" ? "confirmed" : "rejected";

  // Atomic update: only flip the row if it's STILL pending. The first admin
  // to click wins; concurrent or later clicks will affect 0 rows.
  const updateResult = await db().execute({
    sql: `UPDATE requests
            SET status = ?,
                decided_at = datetime('now'),
                decided_by = 'approver (via email)',
                auto_approved = 0
          WHERE id = ? AND status = 'pending'`,
    args: [newStatus, rid],
  });

  // Whether we won or lost the race, re-fetch the row to show the truth.
  const { rows } = await db().execute({
    sql: `SELECT r.*, e.full_name AS employee_name
          FROM requests r JOIN employees e ON e.id = r.employee_id
          WHERE r.id = ?`,
    args: [rid],
  });
  const reqRow: any = rows[0];
  if (!reqRow)
    return Result({
      ok: false,
      title: "Request not found",
      message: "We couldn't find this request — it may have been deleted.",
    });

  // We won the race
  if (updateResult.rowsAffected > 0) {
    return Result({
      ok: true,
      isApproval: act === "approve",
      title:
        act === "approve" ? "Request confirmed" : "Request rejected",
      message:
        act === "approve"
          ? `${reqRow.employee_name}'s time-off request has been confirmed. Thanks for the quick response.`
          : `${reqRow.employee_name}'s time-off request has been marked as rejected.`,
    });
  }

  // We lost the race (or someone already decided previously)
  const when = formatDecidedAt(reqRow.decided_at);
  return Result({
    ok: true,
    isApproval: reqRow.status === "confirmed",
    title: "Already decided",
    message: `${reqRow.employee_name}'s request was ${STATUS_LABEL[reqRow.status] ?? reqRow.status}${
      when ? ` on ${when}` : ""
    }. The first response from any admin is final, so no change was made.`,
  });
}

function Result(props: {
  ok: boolean;
  title: string;
  message: string;
  isApproval?: boolean;
}) {
  const accent = !props.ok
    ? "text-red-700"
    : props.isApproval === false
      ? "text-amber-700"
      : "text-emerald-700";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-ink px-8 py-6 flex items-center gap-3">
          <FattyChemMark size={28} className="text-brand" />
          <div className="flex flex-col leading-none">
            <span className="text-brand text-base font-semibold tracking-tight">
              fattychem
            </span>
            <span className="text-[9px] tracking-[0.25em] text-slate-400 mt-0.5">
              DAYS OFF
            </span>
          </div>
        </div>
        <div className="px-8 py-8">
          <h1 className={`text-lg font-semibold mb-2 ${accent}`}>
            {props.title}
          </h1>
          <p className="text-slate-700 text-sm leading-relaxed">
            {props.message}
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors"
            >
              Open the schedule →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
