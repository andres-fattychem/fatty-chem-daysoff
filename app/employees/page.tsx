import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";
import EmployeesUI from "./EmployeesUI";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  if (!(await isAdmin())) redirect("/login");

  const { rows } = await db().execute(
    "SELECT * FROM employees ORDER BY active DESC, full_name"
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Employees
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Add, edit, or deactivate employees. Deactivated employees stay in
          historical reports but are hidden from request forms.
        </p>
        <EmployeesUI initial={rows as any} />
      </main>
    </div>
  );
}
