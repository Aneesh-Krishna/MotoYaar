"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileText, Receipt, Map } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { formatINR, formatDate, getDocumentStatus } from "@/lib/utils";
import type { Vehicle } from "@/types";

interface Props {
  vehicle: Vehicle;
  activeTab: string;
  totalSpend: number;
  lastService: string | null;
  nextExpiry: string | null;
  storagePreference: "parse_only" | "full_storage";
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "expenses", label: "Expenses" },
  { id: "trips", label: "Trips" },
];

export function VehicleDetailTabs({
  vehicle,
  activeTab,
  totalSpend,
  lastService,
  nextExpiry,
  storagePreference,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
          />
        )}
        {activeTab === "documents" && (
          <>
            <PlaceholderTab
              Icon={FileText}
              message="No documents yet. Add your RC, Insurance, and PUC."
              ctaLabel="Add document"
              onCtaClick={() => setUploadOpen(true)}
            />
            <BottomSheet
              open={uploadOpen}
              onClose={() => setUploadOpen(false)}
              title="Add Document"
            >
              <DocumentUpload
                vehicleId={vehicle.id}
                storagePreference={storagePreference}
                onSuccess={() => {
                  setUploadOpen(false);
                  router.refresh();
                }}
              />
            </BottomSheet>
          </>
        )}
        {activeTab === "expenses" && (
          <PlaceholderTab
            Icon={Receipt}
            message="No expenses yet. Start tracking what you spend on this vehicle."
            ctaLabel="Add Expense"
            ctaHref={`/garage/${vehicle.id}/expenses/new`}
          />
        )}
        {activeTab === "trips" && (
          <PlaceholderTab
            Icon={Map}
            message="No trips yet. Log your first journey."
            ctaLabel="Add Trip"
            ctaHref={`/garage/${vehicle.id}/trips/new`}
          />
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
}

function OverviewTab({ totalSpend, lastService, nextExpiry }: OverviewTabProps) {
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
    </div>
  );
}

// ─── Placeholder Tab ──────────────────────────────────────────────────────────

interface PlaceholderTabProps {
  Icon: React.ElementType;
  message: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

function PlaceholderTab({ Icon, message, ctaLabel, ctaHref, onCtaClick }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
      <Icon size={48} className="text-gray-300" aria-hidden="true" />
      <p className="text-gray-500 text-sm">{message}</p>
      {onCtaClick ? (
        <button
          onClick={onCtaClick}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
        >
          {ctaLabel}
        </button>
      ) : (
        <Link href={ctaHref!}>
          <button className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            {ctaLabel}
          </button>
        </Link>
      )}
    </div>
  );
}
