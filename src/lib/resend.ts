import { Resend } from "resend";

/**
 * Server-side only — never import in client components.
 * Low-level Resend client. All transactional emails go through sendEmail().
 * Higher-level typed builders live in src/services/emailService.ts.
 */

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_ADDRESS =
  process.env.NODE_ENV === "development"
    ? "onboarding@resend.dev"
    : "MotoYaar <noreply@motoyaar.app>";

/** Generic email sender. All emails go through this function. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
