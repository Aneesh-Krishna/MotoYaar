"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/utils/currency";
import type { MonthlyDataPoint } from "@/types";

interface ComparisonPoint {
  month: string;
  primary: number;
  comparison: number;
}

interface Props {
  data: MonthlyDataPoint[];
  currency: string;
  // Comparison mode — when provided, renders two lines using pre-merged data
  comparisonData?: ComparisonPoint[];
  comparisonLabel?: string;
}

export default function LineChartWidget({ data, currency, comparisonData, comparisonLabel }: Props) {
  if (comparisonData) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={comparisonData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | string, name: string) => [
              formatCurrency(Number(value), currency),
              name === "primary" ? (comparisonLabel?.split(" vs ")[0] ?? "Primary") : (comparisonLabel?.split(" vs ")[1] ?? "Comparison"),
            ]}
          />
          <Legend
            formatter={(value) =>
              value === "primary"
                ? (comparisonLabel?.split(" vs ")[0] ?? "Primary")
                : (comparisonLabel?.split(" vs ")[1] ?? "Comparison")
            }
          />
          <Line type="monotone" dataKey="primary" stroke="#F97316" strokeWidth={2} dot={{ fill: "#F97316" }} />
          <Line type="monotone" dataKey="comparison" stroke="#94A3B8" strokeWidth={2} dot={{ fill: "#94A3B8" }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number | string) => [
            formatCurrency(Number(value), currency),
            "Spend",
          ]}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#F97316"
          strokeWidth={2}
          dot={{ fill: "#F97316" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
