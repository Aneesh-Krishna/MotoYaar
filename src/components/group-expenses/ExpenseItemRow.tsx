"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { GroupExpenseItem } from "@/types";
import { formatCurrency } from "@/utils/currency";

interface Props {
  item: GroupExpenseItem;
  sessionId: string;
  currentUserId: string;
  sessionCreatorId: string;
  currency: string;
}

export default function ExpenseItemRow({ item, sessionId, currentUserId, sessionCreatorId, currency }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = item.loggedBy === currentUserId || sessionCreatorId === currentUserId;
  const isIncluded = item.includedUserIds.includes(currentUserId);

  async function handleDelete() {
    if (!confirm("Delete this expense?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-expenses/${sessionId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to delete");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 flex-1">{item.description}</span>
        <span className="text-sm font-semibold text-gray-800 shrink-0">
          {formatCurrency(item.amount, currency)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span>Paid by: <span className="font-medium text-gray-700">{item.paidByName}</span></span>
        <span>Split: {item.includedUserIds.length} {item.includedUserIds.length === 1 ? "person" : "people"}</span>
        <span
          className={isIncluded ? "font-semibold text-orange-600" : ""}
        >
          {formatCurrency(item.perPerson, currency)}/person
          {isIncluded && " (you)"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {item.category}
        </span>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-red-500 disabled:opacity-40"
              aria-label="Delete expense"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
