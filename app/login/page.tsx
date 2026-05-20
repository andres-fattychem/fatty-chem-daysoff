"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FattyChemFullLogo } from "@/components/Logo";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Wrong password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-ink text-white flex flex-col items-center justify-center px-8 py-12 relative overflow-hidden">
        <div className="relative flex flex-col items-center">
          <FattyChemFullLogo width={360} className="mb-2" />
          <p className="mt-8 text-slate-300 text-sm max-w-xs text-center">
            Days Off Planner — internal scheduling for the office team.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm"
        >
          <h1 className="text-xl font-semibold text-slate-900 mb-1">
            Sign in
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter the office admin password to continue.
          </p>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Admin password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          {error && (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
