"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { GroupExpenseSessionMember } from "@/services/groupExpenseService";

const CATEGORIES = ["Food", "Fuel", "Stay", "Toll", "Misc"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  members: GroupExpenseSessionMember[];
  currentUserId: string;
}

export default function AddExpenseSheet({ open, onClose, sessionId, members, currentUserId }: Props) {
  const router = useRouter();
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Misc");
  const [includedUserIds, setIncludedUserIds] = useState<string[]>(members.map((m) => m.userId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggleMember(userId: string) {
    setIncludedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function handleClose() {
    setAmount("");
    setDescription("");
    setCategory("Misc");
    setPaidBy(currentUserId);
    setIncludedUserIds(members.map((m) => m.userId));
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (includedUserIds.length === 0) {
      setError("Select at least one member to split with.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/group-expenses/${sessionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidBy,
          amount: parsedAmount,
          description,
          category,
          includedUserIds,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to add expense");
      }
      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Add Expense">
      <form onSubmit={handleSubmit} className="px-4 pb-6 space-y-4">
        {/* Who Paid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Who paid?</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}{m.userId === currentUserId ? " (Me)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
            placeholder="e.g. Lunch at dhaba"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={[
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  category === cat
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "border-gray-200 text-gray-600 hover:border-orange-300",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Split Between */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Split between ({includedUserIds.length} selected)
          </label>
          <ul className="space-y-2">
            {members.map((m) => {
              const checked = includedUserIds.includes(m.userId);
              return (
                <li key={m.userId}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleMember(m.userId)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-800">
                      {m.name}{m.userId === currentUserId ? " (Me)" : ""}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {includedUserIds.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Select at least one member</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || includedUserIds.length === 0}
          className="w-full bg-orange-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
        >
          {submitting ? "Saving…" : "Add Expense"}
        </button>
      </form>
    </BottomSheet>
  );
}
