"use client";
import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";

export type CalendarRequest = {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: "vacation" | "sick" | "personal" | "half_day";
  start_date: string;
  end_date: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
};

const TYPE_COLOR: Record<string, string> = {
  vacation: "bg-sky-100 text-sky-900 border-sky-200",
  sick: "bg-rose-100 text-rose-900 border-rose-200",
  personal: "bg-violet-100 text-violet-900 border-violet-200",
  half_day: "bg-amber-100 text-amber-900 border-amber-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
};

export default function Calendar({
  requests,
}: {
  requests: CalendarRequest[];
}) {
  const [cursor, setCursor] = useState(() => new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const visibleReqs = useMemo(() => {
    // only show confirmed + pending on the calendar
    return requests.filter(
      (r) => r.status === "confirmed" || r.status === "pending"
    );
  }, [requests]);

  function reqsForDay(day: Date) {
    return visibleReqs.filter((r) => {
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return isWithinInterval(day, { start, end });
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click an entry for details. Pending requests show with a dashed border.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="px-2.5 py-1.5 rounded-md text-sm border border-slate-300 hover:bg-slate-50"
          >
            ←
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-3 py-1.5 rounded-md text-sm border border-slate-300 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-2.5 py-1.5 rounded-md text-sm border border-slate-300 hover:bg-slate-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs font-medium text-slate-500 border-b border-slate-200 bg-slate-50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          const dayReqs = reqsForDay(day);
          return (
            <div
              key={idx}
              className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 ${
                inMonth ? "bg-white" : "bg-slate-50/50"
              }`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  today
                    ? "inline-flex w-6 h-6 items-center justify-center rounded-full bg-brand text-white"
                    : inMonth
                      ? "text-slate-700"
                      : "text-slate-400"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayReqs.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    title={`${r.employee_name} · ${r.leave_type} · ${STATUS_LABEL[r.status]}`}
                    className={`text-[11px] rounded px-1.5 py-0.5 truncate border ${TYPE_COLOR[r.leave_type]} ${
                      r.status === "pending"
                        ? "border-dashed opacity-90"
                        : ""
                    }`}
                  >
                    {r.employee_name}
                  </div>
                ))}
                {dayReqs.length > 4 && (
                  <div className="text-[11px] text-slate-500 pl-1.5">
                    +{dayReqs.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <Legend swatch="bg-sky-100 border-sky-300" label="Vacation" />
        <Legend swatch="bg-rose-100 border-rose-300" label="Sick" />
        <Legend swatch="bg-violet-100 border-violet-300" label="Personal" />
        <Legend swatch="bg-amber-100 border-amber-300" label="Half-day" />
        <span className="ml-auto text-slate-500">
          Dashed border = pending approval
        </span>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded border ${swatch}`}></span>
      {label}
    </span>
  );
}
