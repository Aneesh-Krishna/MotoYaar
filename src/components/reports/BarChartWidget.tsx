"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/utils/currency";
import type { CategoryDataPoint } from "@/types";

interface ComparisonBar {
  month: string;
  primary: number;
  comparison: number;
}

interface Props {
  data: CategoryDataPoint[];
  currency: string;
  // Comparison mode — when provided, renders grouped monthly bars instead of category bars
  comparisonData?: ComparisonBar[];
  comparisonLabel?: string;
}

export default function BarChartWidget({ data, currency, comparisonData, comparisonLabel }: Props) {
  if (comparisonData) {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={comparisonData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
          <Bar dataKey="primary" fill="#F97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="comparison" fill="#94A3B8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number | string) => [
            formatCurrency(Number(value), currency),
            "Amount",
          ]}
        />
        <Bar dataKey="amount" fill="#F97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
