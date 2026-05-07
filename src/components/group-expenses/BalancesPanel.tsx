"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { GroupExpenseBalancesResponse, GroupExpenseBalance, GroupExpenseSettlement } from "@/types";
import { formatCurrency } from "@/utils/currency";

interface Props {
  data: GroupExpenseBalancesResponse;
  sessionId: string;
  currentUserId: string;
  sessionCreatorId: string;
  currency: string;
  canArchive: boolean;
}

export default function BalancesPanel({
  data,
  sessionId,
  currentUserId,
  sessionCreatorId,
  currency,
  canArchive,
}: Props) {
  const router = useRouter();
  const [settledOpen, setSettledOpen] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [archiving, startArchiving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allSettled = data.totalSessionSpend > 0 && data.activeBalances.length === 0;

  function balanceKey(b: GroupExpenseBalance) {
    return `${b.from}__${b.to}`;
  }

  async function handleSettle(balance: GroupExpenseBalance) {
    const key = balanceKey(balance);
    setSettling(key);
    setError(null);
    try {
      const res = await fetch(`/api/group-expenses/${sessionId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: balance.from,
          toUserId: balance.to,
          amount: balance.amount,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to settle");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSettling(null);
    }
  }

  function handleArchive() {
    startArchiving(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/group-expenses/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "archived" }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error?.message ?? "Failed to archive");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function labelBalance(b: GroupExpenseBalance) {
    const isFrom = b.from === currentUserId;
    const isTo = b.to === currentUserId;
    if (isFrom) return `You owe ${b.toName}`;
    if (isTo) return `${b.fromName} owes you`;
    return `${b.fromName} owes ${b.toName}`;
  }

  function canSettle(b: GroupExpenseBalance) {
    return (
      currentUserId === sessionCreatorId ||
      b.from === currentUserId ||
      b.to === currentUserId
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 space-y-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Session Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Spend</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(data.totalSessionSpend, currency)}
          </span>
        </div>
        {data.perMemberShare.map((m) => (
          <div key={m.userId} className="flex justify-between text-sm">
            <span className="text-gray-500">
              {m.userId === currentUserId ? "Your share" : `${m.name}'s share`}
            </span>
            <span className={m.userId === currentUserId ? "font-medium text-orange-600" : "text-gray-700"}>
              {formatCurrency(m.share, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* All settled banner */}
      {allSettled && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center space-y-2">
          <p className="text-green-700 font-semibold text-sm">All settled! 🎉</p>
          {canArchive && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="text-xs text-green-700 underline disabled:opacity-50"
            >
              {archiving ? "Archiving…" : "Archive this session"}
            </button>
          )}
        </div>
      )}

      {/* Active balances */}
      {!allSettled && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Balances</p>
          {data.activeBalances.map((b) => {
            const key = balanceKey(b);
            const isSettling = settling === key;
            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{labelBalance(b)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(b.amount, currency)}</p>
                </div>
                {canSettle(b) && (
                  <button
                    onClick={() => handleSettle(b)}
                    disabled={!!settling}
                    className="text-xs text-orange-600 font-medium border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50 disabled:opacity-50 shrink-0"
                  >
                    {isSettling ? "Settling…" : "Mark as Settled"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Settled section */}
      {data.settlements.length > 0 && (
        <div>
          <button
            onClick={() => setSettledOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 font-medium uppercase tracking-wide mb-2"
          >
            {settledOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Settled ({data.settlements.length})
          </button>
          {settledOpen && (
            <div className="space-y-2">
              {data.settlements.map((s: GroupExpenseSettlement) => (
                <div
                  key={s.id}
                  className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 line-through">
                      {s.from === currentUserId ? "You" : s.fromName} → {s.to === currentUserId ? "you" : s.toName}
                    </p>
                    <p className="text-xs text-gray-400">{formatCurrency(s.amount, currency)}</p>
                  </div>
                  <span className="text-xs text-green-600 font-medium shrink-0">Settled</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
