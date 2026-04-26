"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/utils/currency";
import type { CategoryDataPoint } from "@/types";

const COLORS = ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#C2410C"];

interface Props {
  data: CategoryDataPoint[];
  currency: string;
}

export default function DonutChartWidget({ data, currency }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={60}
          outerRadius={100}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number | string) => [
            formatCurrency(Number(value), currency),
            "Amount",
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
