"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ week: string; posts: number; comments: number }>;
}

export default function AdminBarChartWidget({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip labelFormatter={(l) => `Week of ${l}`} />
        <Legend />
        <Bar dataKey="posts" fill="#6366f1" name="Posts" />
        <Bar dataKey="comments" fill="#a5b4fc" name="Comments" />
      </BarChart>
    </ResponsiveContainer>
  );
}
