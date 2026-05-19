"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: number;
  full_name: string;
  email: string | null;
  department: string | null;
  annual_pto_days: number;
  active: number;
};

export default function EmployeesUI({ initial }: { initial: Employee[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  function startNew() {
    setEditing(null);
    setShowForm(true);
  }
  function startEdit(emp: Employee) {
    setEditing(emp);
    setShowForm(true);
  }
  function done() {
    setShowForm(false);
    setEditing(null);
    router.refresh();
  }

  async function deactivate(emp: Employee) {
    if (
      !confirm(
        `Deactivate ${emp.full_name}? They'll be hidden from forms but their history stays.`
      )
    )
      return;
    await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function reactivate(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: 1 }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={startNew}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Add employee
        </button>
      </div>

      {showForm && (
        <EmployeeForm employee={editing} onDone={done} onCancel={() => setShowForm(false)} />
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Department</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-right px-4 py-3 font-medium">Annual PTO</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((emp) => (
              <tr
                key={emp.id}
                className={`border-b border-slate-100 last:border-0 ${
                  emp.active ? "" : "opacity-50"
                }`}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {emp.full_name}
                  {!emp.active && (
                    <span className="ml-2 text-xs text-slate-500">
                      (inactive)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {emp.department || "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {emp.email || "—"}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                  {emp.annual_pto_days}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-xs text-brand hover:underline mr-3"
                  >
                    Edit
                  </button>
                  {emp.active ? (
                    <button
                      onClick={() => deactivate(emp)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivate(emp)}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeForm({
  employee,
  onDone,
  onCancel,
}: {
  employee: Employee | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [full_name, setName] = useState(employee?.full_name || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [department, setDept] = useState(employee?.department || "");
  const [annual_pto_days, setPto] = useState(employee?.annual_pto_days ?? 20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
    const method = employee ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name,
        email: email || null,
        department: department || null,
        annual_pto_days: Number(annual_pto_days),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Save failed.");
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4"
    >
      <h2 className="font-semibold text-slate-900">
        {employee ? "Edit employee" : "New employee"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Full name" required>
          <input
            value={full_name}
            onChange={(e) => setName(e.target.value)}
            className="emp-input"
            required
          />
        </FormField>
        <FormField label="Department">
          <input
            value={department}
            onChange={(e) => setDept(e.target.value)}
            className="emp-input"
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="emp-input"
          />
        </FormField>
        <FormField label="Annual PTO days">
          <input
            type="number"
            min={0}
            step={1}
            value={annual_pto_days}
            onChange={(e) => setPto(Number(e.target.value))}
            className="emp-input"
          />
        </FormField>
      </div>
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      <style jsx global>{`
        .emp-input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .emp-input:focus {
          outline: none;
          border-color: #ED9221;
          box-shadow: 0 0 0 2px rgb(237 146 33 / 0.25);
        }
      `}</style>
    </form>
  );
}

function FormField({
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
