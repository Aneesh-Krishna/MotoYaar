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
 * Returns null if parsing fails — never throws.
 * Server-side only.
 */
export async function parseDocument(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "application/pdf"
): Promise<{ expiryDate: string | null }> {
  try {
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
                media_type: mimeType === "application/pdf" ? "image/jpeg" : mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `This is an Indian vehicle document (RC, Insurance, PUC, or Driver's License).
Extract the expiry date.
Respond with ONLY a JSON object in this exact format: {"expiryDate": "YYYY-MM-DD"}
If no expiry date is found or the image is unreadable, respond with: {"expiryDate": null}
Do not include any other text.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return { expiryDate: null };

    const parsed = JSON.parse(content.text.trim());
    return { expiryDate: parsed.expiryDate ?? null };
  } catch {
    return { expiryDate: null };
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
