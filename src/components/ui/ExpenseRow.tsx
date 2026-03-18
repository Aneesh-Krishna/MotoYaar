import { cn, formatINR, formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseRowProps {
  expense: Expense;
  className?: string;
}

const REASON_COLORS: Record<string, string> = {
  Service:  "bg-blue-100 text-blue-700",
  Fuel:     "bg-green-100 text-green-700",
  Trip:     "bg-purple-100 text-purple-700",
  Others:   "bg-gray-100 text-gray-600",
};

export function ExpenseRow({ expense, className }: ExpenseRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b border-border last:border-0",
        className
      )}
    >
      {/* Reason chip */}
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-caption font-medium",
          REASON_COLORS[expense.reason] ?? REASON_COLORS["Others"]
        )}
      >
        {expense.reason}
      </span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-foreground truncate">
          {expense.whereText ?? expense.reason}
        </p>
        <p className="text-caption text-foreground-muted mt-0.5">
          {formatDate(expense.date)}
          {expense.comment && (
            <span className="ml-2 italic">{expense.comment}</span>
          )}
        </p>
      </div>

      {/* Amount */}
      <span className="shrink-0 text-body font-semibold text-foreground tabular-nums">
        {formatINR(expense.price)}
      </span>
    </div>
  );
}