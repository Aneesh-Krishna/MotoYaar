"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/utils/currency";
import { SpendChart } from "@/components/reports/SpendChart";
import { SpendTable } from "@/components/reports/SpendTable";
import type { VehicleReport } from "@/types";

type ChartType = "bar" | "line" | "donut";
type TabType = "chart" | "table";

const FILTER_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "year", label: "This year" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
] as const;

interface VehicleReportViewProps {
  report: VehicleReport;
  vehicleId: string;
}

export function VehicleReportView({ report, vehicleId }: VehicleReportViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter") ?? "all";

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") ?? "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function applyFilter(filter: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/reports/vehicles/${vehicleId}?${params.toString()}`);
  }

  const delta = report.totalSpend - report.prevTotalSpend;
  const hasDelta = report.prevTotalSpend > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/garage/${vehicleId}?tab=expenses`} className="text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-semibold text-gray-900 truncate">
          {report.vehicle.name} — Spends
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Date filter */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                currentFilter === opt.value
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom range inputs */}
        {currentFilter === "custom" && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (customFrom && customTo) applyFilter("custom", customFrom, customTo);
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
            >
              Apply
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Total Spend</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {formatCurrency(report.totalSpend, report.currency)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Avg / Month</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {formatCurrency(report.avgMonthlySpend, report.currency)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Top Category</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {report.mostExpensiveCategory ?? "—"}
            </p>
          </div>
        </div>

        {/* Delta line */}
        {hasDelta && currentFilter !== "all" && (
          <p className={`text-sm font-medium ${delta >= 0 ? "text-red-500" : "text-green-600"}`}>
            {delta >= 0 ? "↑" : "↓"}{" "}
            {formatCurrency(Math.abs(delta), report.currency)} vs previous period
          </p>
        )}

        {/* Currency conversion note */}
        {report.hadCurrencyConversion && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Some expenses were recorded in other currencies and have been converted to{" "}
              <strong>{report.currency}</strong> using estimated exchange rates.
            </span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          {(["chart", "table"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? "bg-orange-500 text-white" : "text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chart tab */}
        {activeTab === "chart" && (
          <div className="space-y-3">
            {/* Chart type toggles */}
            <div className="flex gap-2">
              {(["bar", "line", "donut"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                    chartType === type
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              {report.byCategory.length === 0 && report.monthlyData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                  No data for this period.
                </div>
              ) : (
                <SpendChart
                  chartType={chartType}
                  categoryData={report.byCategory}
                  monthlyData={report.monthlyData}
                  currency={report.currency}
                />
              )}
            </div>
          </div>
        )}

        {/* Table tab */}
        {activeTab === "table" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SpendTable data={report.byCategory} currency={report.currency} />
          </div>
        )}
      </div>
    </div>
  );
}
