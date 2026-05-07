"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { HistoryEntry } from "@/components/vehicle-history/HistoryEntry";
import type { VehicleHistoryEntry } from "@/services/vehicleHistoryService";

export default function VehicleHistoryPage() {
  const [reg, setReg] = useState("");
  const [entries, setEntries] = useState<VehicleHistoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedReg, setSearchedReg] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reg.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearched(true);
    setSearchedReg(trimmed);

    try {
      const res = await fetch(`/api/vehicle-history?reg=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: { entries: VehicleHistoryEntry[] } = await res.json();
        setEntries(data.entries);
      } else {
        setEntries([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="px-screen-x py-5 space-y-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
      <div>
        <h1 className="text-xl font-bold text-foreground">Vehicle History</h1>
        <p className="text-caption text-foreground-muted mt-1">
          Look up service history logged by MotoYaar users for any registration number.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={reg}
          onChange={(e) => setReg(e.target.value)}
          placeholder="e.g. MH12AB1234"
          className="flex-1 rounded-input border border-border bg-input px-3 py-2 text-body text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Registration number"
        />
        <button
          type="submit"
          disabled={isSearching || !reg.trim()}
          className="inline-flex items-center gap-2 rounded-btn bg-primary px-4 py-2 text-body font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Search size={16} aria-hidden="true" />
          )}
          Search
        </button>
      </form>

      {searched && !isSearching && (
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-card border border-border bg-card px-4 py-6 text-center">
              <p className="text-body text-foreground-muted">
                No service history found for{" "}
                <span className="font-semibold text-foreground">{searchedReg.replace(/[\s-]/g, "").toUpperCase()}</span>.
                Be the first to add your vehicle&apos;s history by logging expenses in MotoYaar.
              </p>
            </div>
          ) : (
            <>
              <p className="text-caption text-foreground-muted">
                {entries.length} service record{entries.length !== 1 ? "s" : ""} found
              </p>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
