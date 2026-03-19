import pino from "pino";
import pretty from "pino-pretty";

const isDev = process.env.NODE_ENV !== "production";

// Use pino-pretty as a synchronous stream (NOT a transport) to avoid spawning
// a worker thread via thread-stream, which breaks in Next.js's bundled environment.
export const logger = isDev
  ? pino({ level: "debug" }, pretty({ colorize: true, sync: true }))
  : pino({ level: "info" });

// Usage in API routes:
// logger.info({ userId, vehicleId }, "Vehicle created");
// logger.error({ error, requestId }, "AI report generation failed");
