export const SERVICE_REMINDER_DEFAULTS = [
  { type: "Oil Change", kmInterval: 5000, dayInterval: 180 },
  { type: "Chain Lubrication", kmInterval: 500, dayInterval: 30 },
  { type: "Air Filter", kmInterval: 6000, dayInterval: 180 },
  { type: "Tyre Pressure Check", kmInterval: null as number | null, dayInterval: 30 },
  { type: "General Service", kmInterval: 10000, dayInterval: 365 },
] as const;
