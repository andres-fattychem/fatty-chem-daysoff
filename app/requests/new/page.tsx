import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import Nav from "@/components/Nav";
import NewRequestForm from "./NewRequestForm";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  if (!(await isAdmin())) redirect("/login");

  const { rows } = await db().execute(
    "SELECT id, full_name, department FROM employees WHERE active = 1 ORDER BY full_name"
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          New time-off request
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Submit a request on behalf of an employee. Once submitted, an
          approval email will go to the office approver.
        </p>
        <NewRequestForm employees={rows as any} />
      </main>
    </div>
  );
}
