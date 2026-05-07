"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewGroupExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId") ?? undefined;

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/group-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          tripId,
          currency,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message ?? "Failed to create session");
      }

      const session = await res.json();
      router.push(`/group-expenses/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Group Expense Session</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session title <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tripId ? "Defaults to trip title" : "e.g. Ladakh 2026"}
            maxLength={120}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating…" : "Start Session"}
        </button>
      </form>
    </div>
  );
}
