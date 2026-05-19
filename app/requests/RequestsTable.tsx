"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_department: string | null;
  leave_type: "vacation" | "sick" | "personal" | "half_day";
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  created_by: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  auto_approved: number;
};

const TYPE_LABEL: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
  half_day: "Half day",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function fmt(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function RequestsTable({ requests }: { requests: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function decide(id: number, status: "confirmed" | "rejected" | "cancelled") {
    setBusyId(id);
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
        No requests match this filter.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Employee</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-left px-4 py-3 font-medium">Dates</th>
            <th className="text-right px-4 py-3 font-medium">Days</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">
                  {r.employee_name}
                </div>
                {r.employee_department && (
                  <div className="text-xs text-slate-500">
                    {r.employee_department}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {TYPE_LABEL[r.leave_type]}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {r.start_date === r.end_date
                  ? fmt(r.start_date)
                  : `${fmt(r.start_date)} → ${fmt(r.end_date)}`}
                {r.reason && (
                  <div
                    className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]"
                    title={r.reason}
                  >
                    {r.reason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.days_count}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}
                >
                  {r.status}
                </span>
                {r.auto_approved === 1 && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    auto-approved
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {r.status === "pending" ? (
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, "confirmed")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, "rejected")}
                      className="text-xs bg-white hover:bg-red-50 text-red-700 border border-red-300 px-3 py-1 rounded-md disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => decide(r.id, "cancelled")}
                    disabled={busyId === r.id || r.status === "cancelled"}
                    className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
