import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/components/settings/CurrencySetting", () => ({
  CurrencySetting: ({ initialCurrency }: { initialCurrency?: string }) => (
    <div data-testid="currency-setting" data-currency={initialCurrency}>CurrencySetting</div>
  ),
}));

vi.mock("@/components/settings/NotificationsSection", () => ({
  NotificationsSection: ({
    notificationWindowDays,
    emailNotificationsEnabled,
  }: {
    notificationWindowDays: number;
    emailNotificationsEnabled: boolean;
  }) => (
    <div
      data-testid="notifications-section"
      data-window={notificationWindowDays}
      data-email={String(emailNotificationsEnabled)}
    >
      NotificationsSection
    </div>
  ),
}));

vi.mock("@/components/settings/DocumentStorageSection", () => ({
  DocumentStorageSection: ({ currentPreference }: { currentPreference: string }) => (
    <div data-testid="document-storage-section" data-pref={currentPreference}>
      DocumentStorageSection
    </div>
  ),
}));

vi.mock("@/components/ui/SignOutButton", () => ({
  SignOutButton: () => <button data-testid="sign-out-button">Sign Out</button>,
}));

const { SettingsView } = await import("@/components/settings/SettingsView");

// ─── Tests ────────────────────────────────────────────────────────────────────

const defaultProps = {
  initialCurrency: "INR",
  initialNotificationWindowDays: 30,
  initialEmailNotificationsEnabled: true,
  initialDocumentStoragePreference: "parse_only" as const,
};

describe("SettingsView", () => {
  it("renders all 4 sections", () => {
    render(<SettingsView {...defaultProps} />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByTestId("notifications-section")).toBeInTheDocument();
    expect(screen.getByText("Privacy & Data")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("renders all section components", () => {
    render(<SettingsView {...defaultProps} />);

    expect(screen.getByTestId("currency-setting")).toBeInTheDocument();
    expect(screen.getByTestId("notifications-section")).toBeInTheDocument();
    expect(screen.getByTestId("document-storage-section")).toBeInTheDocument();
    expect(screen.getByTestId("sign-out-button")).toBeInTheDocument();
  });

  it("passes correct initial values to NotificationsSection", () => {
    render(
      <SettingsView
        initialCurrency="INR"
        initialNotificationWindowDays={45}
        initialEmailNotificationsEnabled={false}
        initialDocumentStoragePreference="parse_only"
      />
    );

    const section = screen.getByTestId("notifications-section");
    expect(section).toHaveAttribute("data-window", "45");
    expect(section).toHaveAttribute("data-email", "false");
  });

  it("passes correct initial preference to DocumentStorageSection", () => {
    render(
      <SettingsView
        initialCurrency="INR"
        initialNotificationWindowDays={30}
        initialEmailNotificationsEnabled={true}
        initialDocumentStoragePreference="full_storage"
      />
    );

    const section = screen.getByTestId("document-storage-section");
    expect(section).toHaveAttribute("data-pref", "full_storage");
  });

  it("passes initialCurrency to CurrencySetting", () => {
    render(
      <SettingsView
        initialCurrency="USD"
        initialNotificationWindowDays={30}
        initialEmailNotificationsEnabled={true}
        initialDocumentStoragePreference="parse_only"
      />
    );

    expect(screen.getByTestId("currency-setting")).toHaveAttribute("data-currency", "USD");
  });
});
