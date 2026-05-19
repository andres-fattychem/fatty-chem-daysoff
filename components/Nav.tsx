"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FattyChemMark } from "./Logo";

const NAV = [
  { href: "/", label: "Calendar" },
  { href: "/requests", label: "Requests" },
  { href: "/employees", label: "Employees" },
  { href: "/ytd", label: "YTD Report" },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-ink text-white sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <FattyChemMark size={28} className="text-brand" />
            <span className="flex flex-col leading-none">
              <span className="font-semibold text-brand tracking-tight text-[15px]">
                fattychem
              </span>
              <span className="text-[9px] tracking-[0.25em] text-slate-400 mt-0.5">
                DAYS OFF
              </span>
            </span>
          </Link>
          <nav className="hidden sm:flex gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? path === "/"
                  : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-brand"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={logout}
          className="text-sm text-slate-300 hover:text-white"
        >
          Sign out
        </button>
      </div>
      {/* mobile nav */}
      <nav className="sm:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium ${
                active
                  ? "bg-white/10 text-brand"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
