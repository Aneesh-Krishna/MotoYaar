"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentsTab } from "@/components/documents/DocumentsTab";
import { ExpensesTab } from "@/components/expenses/ExpensesTab";
import { ServiceRemindersPanel } from "@/components/vehicles/ServiceRemindersPanel";
import { formatINR, formatDate, getDocumentStatus } from "@/lib/utils";
import type { Vehicle, Document, Expense } from "@/types";

interface Props {
  vehicle: Vehicle;
  activeTab: string;
  totalSpend: number;
  lastService: string | null;
  nextExpiry: string | null;
  storagePreference: "parse_only" | "full_storage";
  documents: Document[];
  expenses: Expense[];
  avgKmpl: number | null;
  lastFillUp: { date: string; litresFilled: number } | null;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "expenses", label: "Expenses" },
  { id: "reminders", label: "Reminders" },
];

export function VehicleDetailTabs({
  vehicle,
  activeTab: initialTab,
  totalSpend,
  lastService,
  nextExpiry,
  storagePreference,
  documents,
  expenses,
  avgKmpl,
  lastFillUp,
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const pathname = usePathname();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `${pathname}?tab=${tabId}`);
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white" role="tablist">
        {TABS.map((tab) => {
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

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="p-4"
      >
        {activeTab === "overview" && (
          <OverviewTab
            totalSpend={totalSpend}
            lastService={lastService}
            nextExpiry={nextExpiry}
            avgKmpl={avgKmpl}
            lastFillUp={lastFillUp}
          />
        )}
        {activeTab === "documents" && (
          <DocumentsTab
            vehicleId={vehicle.id}
            documents={documents}
            storagePreference={storagePreference}
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesTab vehicleId={vehicle.id} vehicleName={vehicle.name} expenses={expenses} />
        )}
        {activeTab === "reminders" && (
          <ServiceRemindersPanel vehicleId={vehicle.id} vehicleType={vehicle.type} />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  totalSpend: number;
  lastService: string | null;
  nextExpiry: string | null;
  avgKmpl: number | null;
  lastFillUp: { date: string; litresFilled: number } | null;
}

function OverviewTab({ totalSpend, lastService, nextExpiry, avgKmpl, lastFillUp }: OverviewTabProps) {
  const nextExpiryStatus = nextExpiry ? getDocumentStatus(nextExpiry) : null;

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Total Spend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Spend</p>
        <p className="text-2xl font-bold text-gray-900">{formatINR(totalSpend)}</p>
      </div>

      {/* Last Service Date */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Service</p>
        <p className="text-lg font-semibold text-gray-900">
          {lastService ? formatDate(lastService) : "No service recorded"}
        </p>
      </div>

      {/* Next Doc Expiry */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Document Expiry</p>
        {nextExpiry && nextExpiryStatus ? (
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-gray-900">{formatDate(nextExpiry)}</p>
            <StatusBadge status={nextExpiryStatus} />
          </div>
        ) : (
          <p className="text-lg font-semibold text-gray-400">No documents added</p>
        )}
      </div>

      {/* Fuel Efficiency */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Fuel Efficiency</p>
        <p className="text-lg font-semibold text-gray-900">
          {avgKmpl != null ? `${avgKmpl.toFixed(1)} kmpl` : "No data yet"}
        </p>
        {avgKmpl != null && (
          <p className="text-xs text-gray-400 mt-0.5">Based on last 5 fill-ups</p>
        )}
      </div>

      {/* Last Fill-Up */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Fill-Up</p>
        {lastFillUp ? (
          <div>
            <p className="text-lg font-semibold text-gray-900">{formatDate(lastFillUp.date)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{lastFillUp.litresFilled.toFixed(1)} L</p>
          </div>
        ) : (
          <p className="text-lg font-semibold text-gray-400">No fill-up recorded</p>
        )}
      </div>
    </div>
  );
}
