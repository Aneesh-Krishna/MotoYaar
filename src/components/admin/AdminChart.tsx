"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return <div className="h-[260px] w-full animate-pulse rounded-xl bg-gray-100" />;
}

const AdminLineChartWidget = dynamic(() => import("./AdminLineChartWidget"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const AdminBarChartWidget = dynamic(() => import("./AdminBarChartWidget"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

type LineData = Array<{ week: string; count: number }>;
type BarData = Array<{ week: string; posts: number; comments: number }>;

interface AdminChartProps {
  title: string;
  data: LineData | BarData;
  type: "line" | "bar";
}

export function AdminChart({ title, data, type }: AdminChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      {type === "line" ? (
        <AdminLineChartWidget data={data as LineData} />
      ) : (
        <AdminBarChartWidget data={data as BarData} />
      )}
    </div>
  );
}
