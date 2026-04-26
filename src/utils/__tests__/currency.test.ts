import { describe, it, expect } from "vitest";
import { convertAmount, getCurrencySymbol, hadCurrencyConversion } from "../currency";

describe("convertAmount", () => {
  it("returns same amount when currencies match", () => {
    expect(convertAmount(1000, "INR", "INR")).toBe(1000);
    expect(convertAmount(50, "USD", "USD")).toBe(50);
  });

  it("converts INR to USD correctly using static rates", () => {
    // 1000 INR * 0.012 = 12 USD
    expect(convertAmount(1000, "INR", "USD")).toBeCloseTo(12, 2);
  });

  it("converts USD to INR correctly", () => {
    // 12 USD / 0.012 = 1000 INR
    expect(convertAmount(12, "USD", "INR")).toBeCloseTo(1000, 1);
  });

  it("converts USD to EUR via INR base", () => {
    // 12 USD → 1000 INR → 11 EUR
    expect(convertAmount(12, "USD", "EUR")).toBeCloseTo(11, 1);
  });

  it("converts INR to GBP", () => {
    // 1000 INR * 0.0095 = 9.5 GBP
    expect(convertAmount(1000, "INR", "GBP")).toBeCloseTo(9.5, 2);
  });

  it("handles unknown currency gracefully (treats rate as 1)", () => {
    // Unknown currency: RATES[unknown] ?? 1 — so inINR = amount/1, result = amount*(RATES[to]??1)
    expect(convertAmount(1000, "XYZ", "INR")).toBeCloseTo(1000, 1);
  });
});

describe("getCurrencySymbol", () => {
  it("returns ₹ for INR", () => {
    expect(getCurrencySymbol("INR")).toBe("₹");
  });

  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns currency code as fallback for unknown currency", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });
});

describe("hadCurrencyConversion", () => {
  it("returns false when all expenses are in target currency", () => {
    const expenses = [{ currency: "INR" }, { currency: "INR" }, { currency: "INR" }];
    expect(hadCurrencyConversion(expenses, "INR")).toBe(false);
  });

  it("returns true when at least one expense differs from target currency", () => {
    const expenses = [{ currency: "INR" }, { currency: "USD" }, { currency: "INR" }];
    expect(hadCurrencyConversion(expenses, "INR")).toBe(true);
  });

  it("returns false for empty expense list", () => {
    expect(hadCurrencyConversion([], "INR")).toBe(false);
  });
});
