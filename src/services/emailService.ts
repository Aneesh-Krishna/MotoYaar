import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

export interface ExpiringDoc {
  id?: string;
  type: string;
  vehicleName: string;
  expiryDate: Date | string;
  daysUntilExpiry: number;
}

function buildExpiryHtml(docs: ExpiringDoc[]): string {
  const rows = docs
    .map((doc) => {
      let statusLabel: string;
      let statusColor: string;

      if (doc.daysUntilExpiry <= 0) {
        statusLabel = "Expired";
        statusColor = "#dc2626";
      } else if (doc.daysUntilExpiry === 1) {
        statusLabel = "Expires tomorrow";
        statusColor = "#F97316";
      } else {
        statusLabel = `Expires in ${doc.daysUntilExpiry} days`;
        statusColor = "#F97316";
      }

      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
            <strong>${doc.type}</strong> — ${doc.vehicleName}<br>
            <span style="color:${statusColor};font-size:13px;">${statusLabel}</span>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#F97316;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">MotoYaar</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin-top:0;">Document Expiry Alert</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>
        <div style="margin-top:24px;text-align:center;">
          <a href="https://motoyaar.app/garage"
             style="display:inline-block;background:#F97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            View in MotoYaar
          </a>
        </div>
      </div>
    </div>`;
}

export const emailService = {
  async sendVehicleInviteEmail(
    to: string,
    vehicleName: string,
    inviteUrl: string
  ): Promise<void> {
    await sendEmail(
      to,
      `You've been invited to access ${vehicleName} on MotoYaar`,
      `<p>You've been invited to view <strong>${vehicleName}</strong>.</p>
       <p><a href="${inviteUrl}">Accept Invite</a></p>`
    );
  },

  async sendBetaInviteEmail(to: string, inviteUrl?: string): Promise<void> {
    await sendEmail(
      to,
      "You're invited to MotoYaar Beta",
      `<p>You've been invited to join MotoYaar.</p>${inviteUrl ? `<p><a href="${inviteUrl}">Join Now</a></p>` : ""}`
    );
  },

  async sendDocumentExpiryEmail(userId: string, docs: ExpiringDoc[]): Promise<void> {
    if (docs.length === 0) return;

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return;

    if (!user.email) {
      logger.warn({ userId }, "Email notification skipped — no email address on record");
      return;
    }

    if (!user.emailNotificationsEnabled) {
      logger.info({ userId }, "Email notification skipped — user opted out");
      return;
    }

    const hasExpired = docs.some((d) => d.daysUntilExpiry <= 0);
    const subject = hasExpired
      ? "Your document has expired — MotoYaar"
      : "Document expiry reminder — MotoYaar";

    const html = buildExpiryHtml(docs);

    try {
      await sendEmail(user.email, subject, html);
    } catch (err) {
      logger.warn({ err, userId }, "sendDocumentExpiryEmail failed");
    }
  },

  async sendDocumentExpiryReminder(to: string, docs: ExpiringDoc[]): Promise<void> {},
};
