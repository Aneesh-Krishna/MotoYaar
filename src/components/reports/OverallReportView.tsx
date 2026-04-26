"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/currency";
import { SpendChart } from "@/components/reports/SpendChart";
import { SpendTable } from "@/components/reports/SpendTable";
import type { OverallReport, ExpenseSnapshot } from "@/types";

type ChartType = "bar" | "line" | "donut";
type TabType = "chart" | "table";
type FilterMode = "monthly" | "range" | "yearly";

interface QuotaState {
  allowed: boolean;
  usedThisMonth: number;
  freePerMonth: number;
}

interface Props {
  report: OverallReport;
}

export function OverallReportView({ report }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = (searchParams.get("filter") ?? "monthly") as FilterMode;
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestReadyReportId, setLatestReadyReportId] = useState<string | null>(null);

  // Monthly mode state
  const [month1, setMonth1] = useState(searchParams.get("month1") ?? "");
  const [month2, setMonth2] = useState(searchParams.get("month2") ?? "");

  // Range mode state
  const [rangeFrom, setRangeFrom] = useState(searchParams.get("from") ?? "");
  const [rangeTo, setRangeTo] = useState(searchParams.get("to") ?? "");
  const [showCompOverride, setShowCompOverride] = useState(
    !!(searchParams.get("compFrom") || searchParams.get("compTo"))
  );
  const [compFrom, setCompFrom] = useState(searchParams.get("compFrom") ?? "");
  const [compTo, setCompTo] = useState(searchParams.get("compTo") ?? "");

  useEffect(() => {
    fetch("/api/reports/ai/quota")
      .then((r) => r.json())
      .then((data: QuotaState) => setQuota(data))
      .catch(() => {});

    fetch("/api/reports/ai")
      .then((r) => r.json())
      .then((data: Array<{ id: string; status: string }>) => {
        const ready = data.find((r) => r.status === "ready");
        if (ready) setLatestReadyReportId(ready.id);
      })
      .catch(() => {});
  }, []);

  function applyFilter(mode: FilterMode, extra?: Record<string, string>) {
    const params = new URLSearchParams({ filter: mode, ...extra });
    router.replace(`/reports?${params.toString()}`);
  }

  async function handleGenerate() {
    if (isGenerating || !quota?.allowed) return;
    setIsGenerating(true);

    // Derive period label from comparisonLabel (take primary part before " vs ")
    const periodLabel = report.comparisonLabel.split(" vs ")[0] ?? report.comparisonLabel;

    // Build snapshot from current report data
    const sortedVehicles = [...report.perVehicle].sort((a, b) => b.total - a.total);
    const snapshot: ExpenseSnapshot = {
      periodLabel,
      totalExpenses: report.totalSpend,
      currency: report.currency,
      byCategory: report.byCategory.map((d) => ({
        category: d.category,
        total: d.amount,
        count: d.count,
      })),
      monthlyTotals: report.monthlyData.map((d) => ({ month: d.month, total: d.primary })),
      vehicleCount: report.perVehicle.length,
      topVehicle: sortedVehicles[0]
        ? { name: sortedVehicles[0].vehicleName, total: sortedVehicles[0].total }
        : undefined,
    };

    try {
      const res = await fetch("/api/reports/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodLabel, expenseSnapshot: snapshot }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message ?? "Failed to request AI report");
        return;
      }

      const { reportId } = await res.json() as { reportId: string };

      toast("Your report is being generated. We'll notify you when it's ready.");

      // Fire-and-forget generation trigger — client does not wait for response
      fetch(`/api/reports/ai/${reportId}/generate`, { method: "POST" }).catch(() => {});

      // Optimistically update quota state
      setQuota((prev) =>
        prev ? { ...prev, allowed: false, usedThisMonth: prev.usedThisMonth + 1 } : prev
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // A-8: extract primary/comparison series from merged ComparisonMonthlyDataPoint[]
  const primaryMonthlyData = report.monthlyData.map((d) => ({ month: d.month, amount: d.primary }));
  const comparisonMonthlyData = report.monthlyData.map((d) => ({ month: d.month, amount: d.comparison }));
  const hasComparison = report.monthlyData.some((d) => d.comparison > 0);

  const delta = report.totalSpend - report.prevTotalSpend;
  const hasDelta = report.prevTotalSpend > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Overall Spend</h1>
        <Link href="/reports/ai" className="text-xs text-orange-500 font-medium">
          Past Reports
        </Link>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Filter mode selector */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          {(["monthly", "range", "yearly"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => applyFilter(mode)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                currentFilter === mode ? "bg-orange-500 text-white" : "text-gray-600"
              }`}
            >
              {mode === "monthly" ? "Monthly" : mode === "range" ? "Date Range" : "Yearly"}
            </button>
          ))}
        </div>

        {/* Monthly sub-inputs */}
        {currentFilter === "monthly" && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Month 1</label>
              <input
                type="month"
                value={month1}
                onChange={(e) => setMonth1(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Month 2</label>
              <input
                type="month"
                value={month2}
                onChange={(e) => setMonth2(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (month1 && month2) applyFilter("monthly", { month1, month2 });
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
            >
              Apply
            </button>
          </div>
        )}

        {/* Date range sub-inputs */}
        {currentFilter === "range" && (
          <div className="space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (rangeFrom && rangeTo) {
                    const extra: Record<string, string> = { from: rangeFrom, to: rangeTo };
                    if (showCompOverride && compFrom && compTo) {
                      extra.compFrom = compFrom;
                      extra.compTo = compTo;
                    }
                    applyFilter("range", extra);
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
              >
                Apply
              </button>
            </div>
            <button
              onClick={() => setShowCompOverride((v) => !v)}
              className="text-xs text-orange-500 font-medium"
            >
              {showCompOverride ? "Hide" : "Override"} comparison range
            </button>
            {showCompOverride && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Comp. From</label>
                  <input
                    type="date"
                    value={compFrom}
                    onChange={(e) => setCompFrom(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Comp. To</label>
                  <input
                    type="date"
                    value={compTo}
                    onChange={(e) => setCompTo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Per-vehicle breakdown cards */}
        {report.perVehicle.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {report.perVehicle.map((v) => (
              <Link key={v.vehicleId} href={`/reports/vehicles/${v.vehicleId}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-3 min-w-[140px] flex-shrink-0">
                  <p className="text-xs text-gray-500 truncate">{v.vehicleName}</p>
                  <p className="font-bold text-gray-900 mt-1 text-sm">
                    {formatCurrency(v.total, report.currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Overall total card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total Spend</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(report.totalSpend, report.currency)}
          </p>
          {hasDelta && (
            <p className={`text-sm font-medium mt-1 ${delta >= 0 ? "text-red-500" : "text-green-600"}`}>
              {delta >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(delta), report.currency)} vs previous period
            </p>
          )}
        </div>

        {/* Comparison label */}
        <p className="text-xs text-gray-500 font-medium">{report.comparisonLabel}</p>

        {/* Currency conversion banner */}
        {report.hadCurrencyConversion && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              Some expenses were recorded in other currencies and have been converted to{" "}
              <strong>{report.currency}</strong> using estimated exchange rates.
            </span>
          </div>
        )}

        {/* Chart / Table tab switcher */}
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
                  monthlyData={primaryMonthlyData}
                  comparisonMonthlyData={hasComparison ? comparisonMonthlyData : undefined}
                  comparisonLabel={hasComparison ? report.comparisonLabel : undefined}
                  currency={report.currency}
                />
              )}
            </div>
          </div>
        )}

        {/* Table tab — primary period only; comparison table is future work */}
        {/* TODO: comparison table */}
        {activeTab === "table" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SpendTable data={report.byCategory} currency={report.currency} />
          </div>
        )}
      </div>

      {/* Generate AI Report button / quota state */}
      <div className="fixed bottom-20 right-4 z-10 flex flex-col items-end gap-2">
        {latestReadyReportId && (
          <Link
            href={`/reports/ai/${latestReadyReportId}`}
            className="bg-white border border-orange-200 text-orange-500 px-4 py-2 rounded-full shadow text-sm font-medium"
          >
            View report
          </Link>
        )}
        {quota && !quota.allowed ? (
          <p className="text-sm text-gray-500 text-center bg-white rounded-full px-4 py-3 shadow-lg border border-gray-200">
            Come back next month for your next free report
          </p>
        ) : report.totalSpend === 0 ? (
          <button
            disabled
            className="flex items-center gap-2 bg-gray-300 text-gray-500 px-4 py-3 rounded-full shadow-lg text-sm font-medium cursor-not-allowed"
          >
            <Sparkles size={16} />
            No data to analyse
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !quota}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-3 rounded-full shadow-lg text-sm font-medium transition-colors"
          >
            <Sparkles size={16} />
            {isGenerating ? "Requesting…" : "Generate AI Report"}
            {quota && (
              <span className="ml-1 text-xs opacity-75">
                ({quota.freePerMonth - quota.usedThisMonth} free this month)
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
