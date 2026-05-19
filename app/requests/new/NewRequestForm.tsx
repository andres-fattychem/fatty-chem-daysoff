"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: number; full_name: string; department: string | null };

export default function NewRequestForm({
  employees,
}: {
  employees: Employee[];
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [leaveType, setLeaveType] = useState<
    "vacation" | "sick" | "personal" | "half_day"
  >("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isHalfDay = leaveType === "half_day";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!startDate) {
      setError("Please pick a start date.");
      return;
    }
    const finalEnd = isHalfDay ? startDate : endDate || startDate;

    setSubmitting(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: finalEnd,
        reason: reason || null,
        created_by: createdBy || null,
      }),
    });
    setSubmitting(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit request.");
      return;
    }
    if (data.email_sent === false) {
      setSuccess(
        `Request submitted (id #${data.id}), but the approval email could not be sent: ${data.email_error}. The request is still saved as pending — you can approve it manually from the Requests page.`
      );
    } else {
      setSuccess(
        `Request submitted (id #${data.id}). An approval email has been sent.`
      );
    }
    // Redirect after short delay
    setTimeout(() => router.push("/requests"), 1500);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
    >
      <Field label="Employee" required>
        <select
          value={employeeId}
          onChange={(e) =>
            setEmployeeId(e.target.value ? Number(e.target.value) : "")
          }
          className="input"
          required
        >
          <option value="">Select an employee…</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name}
              {emp.department ? ` · ${emp.department}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Leave type" required>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ["vacation", "Vacation / PTO"],
              ["sick", "Sick"],
              ["personal", "Personal / Unpaid"],
              ["half_day", "Half day"],
            ] as const
          ).map(([val, lbl]) => (
            <label
              key={val}
              className={`cursor-pointer text-sm border rounded-lg px-3 py-2 text-center transition ${
                leaveType === val
                  ? "bg-brand/10 border-brand text-brand font-medium"
                  : "border-slate-300 hover:border-slate-400 text-slate-700"
              }`}
            >
              <input
                type="radio"
                value={val}
                checked={leaveType === val}
                onChange={() => setLeaveType(val)}
                className="sr-only"
              />
              {lbl}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={isHalfDay ? "Date" : "Start date"} required>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
            required
          />
        </Field>
        {!isHalfDay && (
          <Field label="End date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave blank for a single-day request.
            </p>
          </Field>
        )}
      </div>

      <Field label="Reason (optional)">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="input"
          placeholder="e.g. Family event"
        />
      </Field>

      <Field label="Submitted by (optional)">
        <input
          type="text"
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          className="input"
          placeholder="Your name or email"
        />
      </Field>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand hover:bg-brand-dark text-white font-medium text-sm px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #ED9221;
          box-shadow: 0 0 0 2px rgb(237 146 33 / 0.25);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
