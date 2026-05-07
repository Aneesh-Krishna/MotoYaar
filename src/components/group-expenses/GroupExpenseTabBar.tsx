"use client";

import Link from "next/link";

interface Props {
  sessionId: string;
  activeTab: "expenses" | "balances";
}

export default function GroupExpenseTabBar({ sessionId, activeTab }: Props) {
  const base = `/group-expenses/${sessionId}`;
  const tabs = [
    { key: "expenses", label: "Expenses", href: base },
    { key: "balances", label: "Balances", href: `${base}?tab=balances` },
  ] as const;

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-4">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`flex-1 text-center text-sm py-1.5 rounded-md font-medium transition-colors ${
            activeTab === t.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
