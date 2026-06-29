import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "./_components/AdminNav";

export const metadata = { title: "Admin | Dreamcraft" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // ── Sign-out server action ────────────────────────────────────
  async function signOut() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">

        {/* Wordmark */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-100 px-5">
          <p className="font-heading italic text-xl text-navy leading-none">Dreamcraft</p>
          <span className="ml-2 rounded bg-terracotta/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-terracotta">
            Admin
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>

        {/* Sign out — bottom of sidebar */}
        <div className="border-t border-gray-100 p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm
                         font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <SignOutIcon />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
