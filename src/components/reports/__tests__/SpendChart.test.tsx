import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Mock next/dynamic ────────────────────────────────────────────────────────
// Invoke loader() immediately (at module-load time, while vi.mock intercepts are active),
// store the promise, then drain it during mount.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    // Called during SpendChart module evaluation — vi.mock registry is already set up.
    const modulePromise = loader();

    function DynamicComponent(props: Record<string, unknown>) {
      const [Comp, setComp] = React.useState<React.ComponentType<unknown> | null>(null);
      React.useEffect(() => {
        modulePromise.then((mod) => setComp(() => mod.default));
      }, []);
      if (!Comp) return null;
      return React.createElement(Comp, props);
    }
    return DynamicComponent;
  },
}));

// ─── Mock widget modules ──────────────────────────────────────────────────────
vi.mock("../BarChartWidget", () => ({
  default: ({ currency }: { data: unknown; currency: string }) => (
    <div data-testid="bar-chart-widget" data-currency={currency}>BarChart</div>
  ),
}));

vi.mock("../LineChartWidget", () => ({
  default: ({ currency }: { data: unknown; currency: string }) => (
    <div data-testid="line-chart-widget" data-currency={currency}>LineChart</div>
  ),
}));

vi.mock("../DonutChartWidget", () => ({
  default: ({ currency }: { data: unknown; currency: string }) => (
    <div data-testid="donut-chart-widget" data-currency={currency}>DonutChart</div>
  ),
}));

import { SpendChart } from "../SpendChart";
import type { CategoryDataPoint, MonthlyDataPoint } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryData: CategoryDataPoint[] = [
  { category: "Fuel", amount: 1000, count: 2, percentage: 60 },
  { category: "Service", amount: 667, count: 1, percentage: 40 },
];

const monthlyData: MonthlyDataPoint[] = [
  { month: "Jan 2026", amount: 800 },
  { month: "Feb 2026", amount: 500 },
];

function renderChart(props: React.ComponentProps<typeof SpendChart>) {
  return render(<SpendChart {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SpendChart", () => {
  it("renders BarChartWidget when chartType=bar", async () => {
    renderChart({ chartType: "bar", categoryData, monthlyData, currency: "INR" });

    expect(await screen.findByTestId("bar-chart-widget")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart-widget")).not.toBeInTheDocument();
    expect(screen.queryByTestId("donut-chart-widget")).not.toBeInTheDocument();
  });

  it("renders LineChartWidget when chartType=line", async () => {
    renderChart({ chartType: "line", categoryData, monthlyData, currency: "INR" });

    expect(await screen.findByTestId("line-chart-widget")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart-widget")).not.toBeInTheDocument();
    expect(screen.queryByTestId("donut-chart-widget")).not.toBeInTheDocument();
  });

  it("renders DonutChartWidget when chartType=donut", async () => {
    renderChart({ chartType: "donut", categoryData, monthlyData, currency: "INR" });

    expect(await screen.findByTestId("donut-chart-widget")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart-widget")).not.toBeInTheDocument();
    expect(screen.queryByTestId("line-chart-widget")).not.toBeInTheDocument();
  });

  it("passes currency prop to BarChartWidget", async () => {
    renderChart({ chartType: "bar", categoryData, monthlyData, currency: "USD" });

    expect(await screen.findByTestId("bar-chart-widget")).toHaveAttribute("data-currency", "USD");
  });

  it("passes currency prop to DonutChartWidget", async () => {
    renderChart({ chartType: "donut", categoryData, monthlyData, currency: "EUR" });

    expect(await screen.findByTestId("donut-chart-widget")).toHaveAttribute("data-currency", "EUR");
  });

  it("renders without crashing (dynamic import resolves)", async () => {
    renderChart({ chartType: "bar", categoryData, monthlyData, currency: "INR" });
    expect(await screen.findByTestId("bar-chart-widget")).toBeInTheDocument();
  });
});
