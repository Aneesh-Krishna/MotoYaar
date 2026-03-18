import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ─── Error Response Shape ──────────────────────────────────────────────────
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}

// ─── Custom Error Classes ──────────────────────────────────────────────────
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

// ─── Central API Error Handler ─────────────────────────────────────────────
export function handleApiError(error: unknown): NextResponse {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const base = { timestamp, requestId };

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.flatten(), ...base } },
      { status: 422 }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: error.message, ...base } },
      { status: 404 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: error.message, ...base } },
      { status: 403 }
    );
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: error.message, ...base } },
      { status: 409 }
    );
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      { error: { code: "QUOTA_EXCEEDED", message: error.message, ...base } },
      { status: 403 }
    );
  }

  console.error("[API Error]", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", ...base } },
    { status: 500 }
  );
}
