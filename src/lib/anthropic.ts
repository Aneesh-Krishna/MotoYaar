/**
 * Anthropic AI client utilities.
 * Server-side only — never import in client components.
 */
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Parse a vehicle document image to extract the expiry date.
 * Accepts an ArrayBuffer (from multipart form data) and converts to base64 internally.
 * Returns null if parsing fails — never throws.
 * Server-side only.
 */
export async function parseDocument(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ expiryDate: string | null; confidence: "high" | "medium" | "low" | "none" }> {
  try {
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const imageMediaType: "image/jpeg" | "image/png" =
      mimeType.includes("png") ? "image/png" : "image/jpeg";

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `This is an Indian vehicle document (RC, Insurance, PUC, or Driver's License).
Extract ONLY the expiry date or validity date.
Return JSON: { "expiryDate": "YYYY-MM-DD" or null, "confidence": "high" | "medium" | "low" | "none" }
If no expiry date is found, return null for expiryDate and "none" for confidence.
Return ONLY valid JSON — no markdown, no explanation.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return { expiryDate: null, confidence: "none" };

    const parsed = JSON.parse(content.text.trim());
    return {
      expiryDate: parsed.expiryDate ?? null,
      confidence: parsed.confidence ?? "none",
    };
  } catch {
    return { expiryDate: null, confidence: "none" };
  }
}

/**
 * Generate a narrative AI spend report from expense data.
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

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response format from Claude API");
  return content.text;
}
