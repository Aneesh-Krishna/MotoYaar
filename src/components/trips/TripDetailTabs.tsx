"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Trip, Expense } from "@/types";

import TripOverviewTab from "./TripOverviewTab";

interface Props {
  trip: Trip;
  linkedExpense: Expense | null;
  activeTab: string;
  visibleTabs: string[];
}

const TABS = [
  { id: "overview", label: "Overview" },
];

export default function TripDetailTabs({
  trip,
  linkedExpense,
  activeTab,
  visibleTabs,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 bg-white" role="tablist">
        {TABS.filter(tab => visibleTabs.includes(tab.id)).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={[
                "flex-1 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-orange-500 border-b-2 border-orange-500"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        className="px-4 py-4"
      >
        {activeTab === "overview" && (
          <TripOverviewTab trip={trip} linkedExpense={linkedExpense} />
        )}
      </div>
    </div>
  );
}
