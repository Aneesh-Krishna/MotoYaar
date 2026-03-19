import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NAV_TABS } from "@/config/nav";

// ─── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// ─── Mock next/link ───────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";

// ─── NAV_TABS config tests ────────────────────────────────────────────────────

describe("NAV_TABS config", () => {
  it("has exactly 5 tabs", () => {
    expect(NAV_TABS).toHaveLength(5);
  });

  it("tabs are in the correct order", () => {
    const labels = NAV_TABS.map((t) => t.label);
    expect(labels).toEqual(["Home", "Garage", "Community", "Trips", "Profile"]);
  });

  it("Home tab href is /", () => {
    expect(NAV_TABS[0].href).toBe("/");
  });

  it("each tab has a defined Icon component", () => {
    NAV_TABS.forEach((tab) => {
      expect(tab.Icon).toBeDefined();
      expect(tab.Icon).not.toBeNull();
    });
  });
});

// ─── BottomNav active-state logic ─────────────────────────────────────────────

describe("BottomNav active-state logic", () => {
  function isActive(tabHref: string, pathname: string): boolean {
    return tabHref === "/" ? pathname === "/" : pathname.startsWith(tabHref);
  }

  it("marks / as active only when pathname is exactly /", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/garage")).toBe(false);
  });

  it("marks /garage as active for /garage and /garage/new", () => {
    expect(isActive("/garage", "/garage")).toBe(true);
    expect(isActive("/garage", "/garage/new")).toBe(true);
    expect(isActive("/garage", "/community")).toBe(false);
  });

  it("marks /community as active for /community and sub-paths", () => {
    expect(isActive("/community", "/community")).toBe(true);
    expect(isActive("/community", "/community/new")).toBe(true);
  });
});

// ─── BottomNav DOM rendering tests ───────────────────────────────────────────

describe("BottomNav", () => {
  it("renders all 5 tabs", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<BottomNav />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
  });

  it("marks the active tab with aria-selected=true (Home on /)", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<BottomNav />);

    const homeTab = screen.getByRole("tab", { name: "Home" });
    expect(homeTab).toHaveAttribute("aria-selected", "true");

    const garageTab = screen.getByRole("tab", { name: "Garage" });
    expect(garageTab).toHaveAttribute("aria-selected", "false");
  });

  it("marks Garage tab active when pathname is /garage", () => {
    vi.mocked(usePathname).mockReturnValue("/garage");
    render(<BottomNav />);

    const garageTab = screen.getByRole("tab", { name: "Garage" });
    expect(garageTab).toHaveAttribute("aria-selected", "true");

    const homeTab = screen.getByRole("tab", { name: "Home" });
    expect(homeTab).toHaveAttribute("aria-selected", "false");
  });

  it("has role=tablist on the nav element", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<BottomNav />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("is hidden at lg breakpoint via lg:hidden class", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<BottomNav />);

    const nav = screen.getByRole("tablist");
    expect(nav.className).toContain("lg:hidden");
  });
});
