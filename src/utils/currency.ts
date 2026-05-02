export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
] as const;

// Approximate exchange rates relative to INR
const RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 1 / 0.012,
  EUR: 90.5,
  GBP: 1 / 0.0095,
  AED: 22.7,
  SGD: 62.0,
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = RATES_TO_INR[fromCurrency] ?? 1;
  const toRate = RATES_TO_INR[toCurrency] ?? 1;
  return (amount * fromRate) / toRate;
}

export function hadCurrencyConversion(
  expenses: { currency: string }[],
  targetCurrency: string
): boolean {
  return expenses.some((e) => e.currency !== targetCurrency);
}
