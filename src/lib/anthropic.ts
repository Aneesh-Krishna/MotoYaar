/**
 * AI client utilities — supports Anthropic, Google Gemini, and Mistral.
 * Switch via AI_PROVIDER env var: "anthropic" | "gemini" | "mistral" (default: "gemini")
 * Server-side only — never import in client components.
 */
import { logger } from "@/lib/logger";

export type ParseReason = "extracted" | "no_date_found" | "parse_error" | "api_error";
type Provider = "anthropic" | "gemini" | "mistral";

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as Provider;

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function parseWithAnthropic(
  base64: string,
  imageMediaType: "image/jpeg" | "image/png"
): Promise<{ expiryDate: string | null; confidence: "high" | "medium" | "low" | "none"; reason: ParseReason }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType, data: base64 } },
          { type: "text", text: PARSE_PROMPT },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    logger.warn({ stopReason: response.stop_reason }, "parseDocument[anthropic]: unexpected response type");
    return { expiryDate: null, confidence: "none", reason: "parse_error" };
  }
  return extractFromJson(content.text);
}

async function generateReportWithAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response format from Anthropic API");
  return content.text;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function parseWithGemini(
  base64: string,
  imageMediaType: string
): Promise<{ expiryDate: string | null; confidence: "high" | "medium" | "low" | "none"; reason: ParseReason }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: imageMediaType } },
    PARSE_PROMPT,
  ]);

  return extractFromJson(result.response.text().trim());
}

async function generateReportWithGemini(prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("Unexpected empty response from Gemini API");
  return text;
}

// ─── Mistral ──────────────────────────────────────────────────────────────────
// Uses fetch directly instead of the SDK — the Mistral SDK v2.x omits
// Content-Length on large base64 payloads, causing 411 errors in Next.js.

async function mistralChat(model: string, messages: unknown[]): Promise<string> {
  const body = JSON.stringify({ model, messages });
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MISTRAL_API_KEY!}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Unexpected response shape from Mistral API");
  return content;
}

async function parseWithMistral(
  base64: string,
  imageMediaType: string
): Promise<{ expiryDate: string | null; confidence: "high" | "medium" | "low" | "none"; reason: ParseReason }> {
  const content = await mistralChat("pixtral-12b-2409", [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${imageMediaType};base64,${base64}` } },
        { type: "text", text: PARSE_PROMPT },
      ],
    },
  ]);
  return extractFromJson(content.trim());
}

async function generateReportWithMistral(prompt: string): Promise<string> {
  return mistralChat("mistral-small-latest", [{ role: "user", content: prompt }]);
}

// ─── Shared prompt & JSON extraction ─────────────────────────────────────────

const PARSE_PROMPT = `This is an Indian vehicle document (RC, Insurance, PUC, or Driver's License including mParivahan Virtual DL).
Extract the expiry or validity date. Look for fields labelled any of:
- Expiry Date / Valid Upto / Valid Till / Validity
- Licence Validity (Non Transport) / Licence Validity (Transport)
- Insurance Valid Upto / Policy Expiry
- Valid Until / Renewal Date
Date formats may be DD-Mon-YYYY (e.g. 20-Apr-2043), DD/MM/YYYY, or YYYY-MM-DD — convert to YYYY-MM-DD.
IMPORTANT: Read year digits carefully and precisely. Expiry years in the 2030s–2050s are common and valid (e.g. driving licences valid 20 years, long-term insurance policies). Do NOT misread or transpose digits — e.g. 2043 must not become 2024, 2042 must not become 2022. Always extract the exact year shown.
Return JSON: { "expiryDate": "YYYY-MM-DD" or null, "confidence": "high" | "medium" | "low" | "none" }
If no expiry/validity date is found, return null for expiryDate and "none" for confidence.
Return ONLY valid JSON — no markdown, no explanation.`;

function extractFromJson(
  text: string
): { expiryDate: string | null; confidence: "high" | "medium" | "low" | "none"; reason: ParseReason } {
  let parsed: { expiryDate?: string | null; confidence?: string };
  try {
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(clean);
  } catch {
    logger.warn({ rawResponse: text }, "parseDocument: AI returned non-JSON");
    return { expiryDate: null, confidence: "none", reason: "parse_error" };
  }

  if (!parsed.expiryDate) {
    logger.info({ confidence: parsed.confidence }, "parseDocument: no date found in document");
    return { expiryDate: null, confidence: "none", reason: "no_date_found" };
  }

  return {
    expiryDate: parsed.expiryDate,
    confidence: (parsed.confidence as "high" | "medium" | "low" | "none") ?? "none",
    reason: "extracted",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a vehicle document image to extract the expiry date.
 * Provider selected via AI_PROVIDER env var ("anthropic" | "gemini" | "mistral", default: "gemini").
 * Never throws — returns reason so callers can surface meaningful errors.
 * Server-side only.
 */
export async function parseDocument(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ expiryDate: string | null; confidence: "high" | "medium" | "low" | "none"; reason: ParseReason }> {
  try {
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const imageMediaType = mimeType.includes("png") ? "image/png" : "image/jpeg";

    logger.info({ provider: PROVIDER }, "parseDocument: calling AI");

    if (PROVIDER === "anthropic") return await parseWithAnthropic(base64, imageMediaType);
    if (PROVIDER === "mistral") return await parseWithMistral(base64, imageMediaType);
    return await parseWithGemini(base64, imageMediaType);
  } catch (err) {
    logger.error({ err, provider: PROVIDER }, "parseDocument: AI API call failed");
    return { expiryDate: null, confidence: "none", reason: "api_error" };
  }
}

/**
 * Generate a narrative AI spend report from expense data.
 * Provider selected via AI_PROVIDER env var ("anthropic" | "gemini" | "mistral", default: "gemini").
 * Throws on failure (caller handles async retry/error state).
 * Server-side only.
 */
export async function generateReport(expenseData: {
  userId: string;
  period: string;
  totalSpend: number;
  currency: string;
  vehicles: Array<{
    name: string;
    totalSpend: number;
    breakdown: Array<{ category: string; amount: number }>;
  }>;
}): Promise<string> {
  const prompt = `You are a financial analysis assistant for MotoYaar, an Indian vehicle management app.
Analyse the following vehicle expense data and write a helpful, friendly narrative report (2-3 paragraphs).
Focus on: total spend trends, most expensive categories, comparisons between vehicles, and 1-2 actionable observations.
Keep the tone casual and practical, like a knowledgeable friend giving advice.
Write in English. All amounts are in ${expenseData.currency}.

Data:
${JSON.stringify(expenseData, null, 2)}

Write the report now:`;

  if (PROVIDER === "anthropic") return generateReportWithAnthropic(prompt);
  if (PROVIDER === "mistral") return generateReportWithMistral(prompt);
  return generateReportWithGemini(prompt);
}
