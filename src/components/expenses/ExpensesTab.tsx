"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus } from "lucide-react";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Expense } from "@/types";

interface ExpensesTabProps {
  vehicleId: string;
  vehicleName?: string;
  expenses: Expense[];
}

export function ExpensesTab({ vehicleId, vehicleName, expenses }: ExpensesTabProps) {
  const router = useRouter();
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showTripSheet, setShowTripSheet] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const editExpense = expenses.find((e) => e.id === editExpenseId) ?? null;

  const handleTripRedirect = () => {
    setShowExpenseSheet(false);
    setShowTripSheet(true);
  };

  const handleTapExpense = (id: string) => {
    setEditExpenseId(id);
  };

  return (
    <>
      {expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt size={48} />}
          heading="No expenses yet."
          subtext="Start tracking what you spend on this vehicle."
          action={
            <button
              onClick={() => setShowExpenseSheet(true)}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Add Expense
            </button>
          }
        />
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {expenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} onTap={handleTapExpense} />
            ))}
          </div>

          {/* See Spends button */}
          <div className="px-4 py-4">
            <Link href={`/reports/vehicles/${vehicleId}`}>
              <button className="w-full border border-gray-200 rounded-lg py-3 text-sm text-gray-600 font-medium">
                See Spends Report
              </button>
            </Link>
          </div>

          {/* Add Expense CTA */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowExpenseSheet(true)}
              className="w-full border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
        </>
      )}

      <BottomSheet
        open={showExpenseSheet}
        onClose={() => setShowExpenseSheet(false)}
        title="Add Expense"
      >
        <ExpenseForm
          vehicleId={vehicleId}
          vehicleName={vehicleName}
          onSaved={() => {
            setShowExpenseSheet(false);
            router.refresh();
          }}
          onTripRedirect={handleTripRedirect}
        />
      </BottomSheet>

      {/* Trip form stub — Story 6.1 will replace this with the real AddTripForm */}
      <BottomSheet
        open={showTripSheet}
        onClose={() => setShowTripSheet(false)}
        title="Add Trip"
      >
        <div className="p-4 text-center text-gray-500 text-sm py-8">
          Trip form coming in Story 6.1
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!editExpenseId}
        onClose={() => setEditExpenseId(null)}
        title="Edit Expense"
      >
        {editExpense && (
          <ExpenseForm
            vehicleId={vehicleId}
            vehicleName={vehicleName}
            expense={editExpense}
            onSaved={() => {
              setEditExpenseId(null);
              router.refresh();
            }}
            onTripRedirect={() => {
              setEditExpenseId(null);
              setShowTripSheet(true);
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}
