"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Confirm you've verified the payment screenshot and mark this order as paid?")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update order");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Updating…" : "Mark as Paid"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
