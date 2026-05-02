"use client";

import { format } from "date-fns";
import { Paperclip } from "lucide-react";
import { formatINR } from "@/utils/currency";
import type { Expense, ExpenseReason } from "@/types";

// ─── ReasonBadge ──────────────────────────────────────────────────────────────

const REASON_COLORS: Record<ExpenseReason, string> = {
  Service: "bg-blue-50 text-blue-700",
  Fuel: "bg-yellow-50 text-yellow-700",
  Trip: "bg-orange-50 text-orange-700",
  Others: "bg-gray-100 text-gray-600",
};

interface ReasonBadgeProps {
  reason: ExpenseReason;
}

export function ReasonBadge({ reason }: ReasonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[reason]}`}
    >
      {reason}
    </span>
  );
}

// ─── ExpenseRow ───────────────────────────────────────────────────────────────

interface ExpenseRowProps {
  expense: Expense;
  onTap: (id: string) => void;
}

export function ExpenseRow({ expense, onTap }: ExpenseRowProps) {
  return (
    <button
      onClick={() => onTap(expense.id)}
      className="w-full text-left px-4 py-3 flex items-center justify-between active:bg-gray-50"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ReasonBadge reason={expense.reason} />
          {expense.whereText && (
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              {expense.whereText}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {format(new Date(expense.date), "d MMM yyyy")}
        </span>
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="font-semibold text-gray-900">{formatINR(expense.price)}</span>
        {expense.receiptUrl && <Paperclip size={14} className="text-gray-400" />}
      </div>
    </button>
  );
}
