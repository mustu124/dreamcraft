"use client";

import { useMemo, useState } from "react";
import type { SubscriberRow } from "../page";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function toCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function SubscribersTable({ subscribers }: { subscribers: SubscriberRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) =>
      s.first_name.toLowerCase().includes(q) ||
      (s.last_name ?? "").toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [subscribers, search]);

  function handleExport() {
    const header = ["First name", "Last name", "Email", "Subscribed on"];
    const rows = filtered.map((s) => [
      s.first_name,
      s.last_name ?? "",
      s.email,
      formatDate(s.created_at),
    ]);
    const csv = [header, ...rows].map((r) => r.map(toCsvField).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dreamcraft-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ── Search + export ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Summary strip ────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{subscribers.length}</p>
          <p className="text-xs text-gray-400">total subscribers</p>
        </div>
        {search && (
          <>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
              <p className="text-xs text-gray-400">matching search</p>
            </div>
          </>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_140px] items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          {(["Name", "Email", "Subscribed"] as const).map((h) => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {subscribers.length === 0 ? "No subscribers yet." : "No subscribers match your search."}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_1fr_140px] items-center gap-3 px-4 py-3"
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {s.first_name} {s.last_name ?? ""}
                </p>
                <p className="truncate text-sm text-gray-500">{s.email}</p>
                <p className="text-sm text-gray-500">{formatDate(s.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
