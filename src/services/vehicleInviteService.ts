import { db } from "@/lib/db/client";
import { vehicleInvites, vehicleAccess, users, vehicles } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { ConflictError, BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { vehicleService } from "@/services/vehicleService";
import { userService } from "@/services/userService";
import { emailService } from "@/services/emailService";
import { logger } from "@/lib/logger";

export interface VehicleInviteRecord {
  id: string;
  vehicleId: string;
  ownerUserId: string;
  inviteeEmail: string;
  token: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface VehicleAccessRecord {
  id: string;
  vehicleId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  accessLevel: string;
  grantedAt: Date;
}

export const vehicleInviteService = {
  async createInvite(
    ownerUserId: string,
    vehicleId: string,
    inviteeEmail: string
  ): Promise<VehicleInviteRecord> {
    // Ownership check — throws ForbiddenError if not the owner
    const vehicle = await vehicleService.getByIdOwnerOnly(vehicleId, ownerUserId);

    // Self-invite check is skipped — users table has no email column (Google OAuth only)
    void userService.getById(ownerUserId);

    const existing = await db.query.vehicleInvites.findFirst({
      where: and(
        eq(vehicleInvites.vehicleId, vehicleId),
        eq(vehicleInvites.inviteeEmail, inviteeEmail.toLowerCase()),
        eq(vehicleInvites.status, "pending")
      ),
    });
    if (existing) throw new ConflictError("A pending invite already exists for this email");

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const token = crypto.randomUUID();

    const [invite] = await db
      .insert(vehicleInvites)
      .values({
        vehicleId,
        ownerUserId,
        inviteeEmail: inviteeEmail.toLowerCase(),
        token,
        expiresAt,
      })
      .returning();

    const inviteUrl = `https://motoyaar.app/invites/${invite.token}`;
    try {
      await emailService.sendVehicleInviteEmail(inviteeEmail, vehicle.name, inviteUrl);
    } catch (err) {
      logger.error({ err, inviteId: invite.id, inviteeEmail }, "createInvite: email delivery failed — invite created but email not sent");
    }

    return {
      id: invite.id,
      vehicleId: invite.vehicleId,
      ownerUserId: invite.ownerUserId,
      inviteeEmail: invite.inviteeEmail,
      token: invite.token,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  },

  async listPendingInvites(vehicleId: string, ownerUserId: string): Promise<VehicleInviteRecord[]> {
    await vehicleService.getByIdOwnerOnly(vehicleId, ownerUserId);

    const rows = await db.query.vehicleInvites.findMany({
      where: and(
        eq(vehicleInvites.vehicleId, vehicleId),
        eq(vehicleInvites.status, "pending"),
        gte(vehicleInvites.expiresAt, new Date()),
      ),
    });

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      ownerUserId: r.ownerUserId,
      inviteeEmail: r.inviteeEmail,
      token: r.token,
      status: r.status,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  },

  async acceptInvite(token: string, userId: string): Promise<{ vehicleId: string }> {
    const invite = await db.query.vehicleInvites.findFirst({
      where: eq(vehicleInvites.token, token),
    });

    if (!invite) throw new NotFoundError("Invite not found");

    if (invite.status === "accepted") {
      throw new ConflictError("This invite has already been accepted.");
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new ConflictError("This invite has expired. Ask the vehicle owner to send a new one.");
    }

    // Email verification skipped — users table has no email column (Google OAuth only)
    // Token possession is sufficient proof of invite ownership

    await db
      .insert(vehicleAccess)
      .values({ vehicleId: invite.vehicleId, userId, accessLevel: "view" })
      .onConflictDoNothing();

    await db
      .update(vehicleInvites)
      .set({ status: "accepted" })
      .where(eq(vehicleInvites.id, invite.id));

    return { vehicleId: invite.vehicleId };
  },

  async revokeAccess(vehicleAccessId: string, ownerUserId: string): Promise<{ vehicleName: string; revokedUserId: string }> {
    const rows = await db
      .select({
        id: vehicleAccess.id,
        userId: vehicleAccess.userId,
        vehicleName: vehicles.name,
        vehicleOwnerId: vehicles.userId,
      })
      .from(vehicleAccess)
      .innerJoin(vehicles, eq(vehicleAccess.vehicleId, vehicles.id))
      .where(eq(vehicleAccess.id, vehicleAccessId));

    if (rows.length === 0) throw new NotFoundError("Access record not found");
    const row = rows[0];
    if (row.vehicleOwnerId !== ownerUserId) throw new ForbiddenError("You do not own this vehicle");

    await db.delete(vehicleAccess).where(eq(vehicleAccess.id, vehicleAccessId));
    return { vehicleName: row.vehicleName, revokedUserId: row.userId };
  },

  async cancelInvite(inviteId: string, ownerUserId: string): Promise<void> {
    const invite = await db.query.vehicleInvites.findFirst({
      where: eq(vehicleInvites.id, inviteId),
    });
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.ownerUserId !== ownerUserId) throw new ForbiddenError("Not your invite");
    if (invite.status !== "pending") throw new BadRequestError("Only pending invites can be cancelled");
    await db.delete(vehicleInvites).where(eq(vehicleInvites.id, inviteId));
  },

  async listAccess(vehicleId: string, ownerUserId: string): Promise<VehicleAccessRecord[]> {
    await vehicleService.getByIdOwnerOnly(vehicleId, ownerUserId);

    const rows = await db
      .select({
        id: vehicleAccess.id,
        vehicleId: vehicleAccess.vehicleId,
        userId: vehicleAccess.userId,
        userName: users.name,
        accessLevel: vehicleAccess.accessLevel,
        grantedAt: vehicleAccess.grantedAt,
      })
      .from(vehicleAccess)
      .leftJoin(users, eq(vehicleAccess.userId, users.id))
      .where(eq(vehicleAccess.vehicleId, vehicleId));

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      userId: r.userId,
      userName: r.userName,
      userEmail: null,
      accessLevel: r.accessLevel,
      grantedAt: r.grantedAt,
    }));
  },
};
