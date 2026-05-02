"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/currency";
import type { CategoryDataPoint } from "@/types";

type SortKey = "category" | "count" | "amount" | "percentage";
type SortDir = "asc" | "desc";

export interface SpendTableProps {
  data: CategoryDataPoint[];
  currency: string;
}

export function SpendTable({ data, currency }: SpendTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortKey === "category") return mul * a.category.localeCompare(b.category);
    return mul * (a[sortKey] - b[sortKey]);
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-orange-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {(
              [
                { key: "category" as SortKey, label: "Category" },
                { key: "count" as SortKey, label: "Count" },
                { key: "amount" as SortKey, label: "Total" },
                { key: "percentage" as SortKey, label: "% of Total" },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="cursor-pointer select-none py-3 px-4 text-left font-medium text-gray-600 hover:text-gray-900"
              >
                {label}
                <SortIcon col={key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-400">
                No expenses in this period.
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={row.category} className="border-b border-gray-100 last:border-0">
                <td className="py-3 px-4 font-medium text-gray-900">{row.category}</td>
                <td className="py-3 px-4 text-gray-600">{row.count}</td>
                <td className="py-3 px-4 text-gray-900">{formatCurrency(row.amount, currency)}</td>
                <td className="py-3 px-4 text-gray-600">{row.percentage}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
