import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty" },
  }),
});

// Usage in API routes:
// logger.info({ userId, vehicleId }, "Vehicle created");
// logger.error({ error, requestId }, "AI report generation failed");
