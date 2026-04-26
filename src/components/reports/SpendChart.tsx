"use client";

import dynamic from "next/dynamic";
import type { CategoryDataPoint, MonthlyDataPoint } from "@/types";

function ChartSkeleton() {
  return <div className="h-[280px] w-full animate-pulse rounded-xl bg-gray-100" />;
}

// Recharts must NOT be statically imported — load it only when charts render
const BarChartWidget = dynamic(() => import("./BarChartWidget"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const LineChartWidget = dynamic(() => import("./LineChartWidget"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const DonutChartWidget = dynamic(() => import("./DonutChartWidget"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export interface SpendChartProps {
  chartType: "bar" | "line" | "donut";
  categoryData: CategoryDataPoint[];
  monthlyData: MonthlyDataPoint[];
  currency: string;
  // Comparison mode — optional; only passed by OverallReportView (A-8: pre-split from ComparisonMonthlyDataPoint[])
  comparisonMonthlyData?: MonthlyDataPoint[];
  comparisonLabel?: string;
}

export function SpendChart({
  chartType,
  categoryData,
  monthlyData,
  currency,
  comparisonMonthlyData,
  comparisonLabel,
}: SpendChartProps) {
  if (chartType === "bar") {
    if (comparisonMonthlyData) {
      // Merge primary + comparison into grouped bar format
      const allMonths = [...new Set([...monthlyData.map((d) => d.month), ...comparisonMonthlyData.map((d) => d.month)])];
      const mergedData = allMonths.map((month) => ({
        month,
        primary: monthlyData.find((d) => d.month === month)?.amount ?? 0,
        comparison: comparisonMonthlyData.find((d) => d.month === month)?.amount ?? 0,
      }));
      return <BarChartWidget data={categoryData} currency={currency} comparisonData={mergedData} comparisonLabel={comparisonLabel} />;
    }
    return <BarChartWidget data={categoryData} currency={currency} />;
  }

  if (chartType === "line") {
    if (comparisonMonthlyData) {
      const allMonths = [...new Set([...monthlyData.map((d) => d.month), ...comparisonMonthlyData.map((d) => d.month)])];
      const mergedData = allMonths.map((month) => ({
        month,
        primary: monthlyData.find((d) => d.month === month)?.amount ?? 0,
        comparison: comparisonMonthlyData.find((d) => d.month === month)?.amount ?? 0,
      }));
      return <LineChartWidget data={monthlyData} currency={currency} comparisonData={mergedData} comparisonLabel={comparisonLabel} />;
    }
    return <LineChartWidget data={monthlyData} currency={currency} />;
  }

  // Donut: always primary category data only — no comparison makes sense on a donut
  return <DonutChartWidget data={categoryData} currency={currency} />;
}
