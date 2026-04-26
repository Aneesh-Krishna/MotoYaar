import { db } from "@/lib/db/client";
import { adminAccounts, users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const ADMIN_SYSTEM_USER_EMAIL = "official@motoyaar.app";

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }

  const existing = await db.query.adminAccounts.findFirst({
    where: eq(adminAccounts.email, adminEmail),
  });

  if (existing) {
    console.log("Admin account already exists — skipping");
  } else {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.insert(adminAccounts).values({ email: adminEmail, passwordHash: hash });
    console.log(`Admin account created: ${adminEmail}`);
  }

  const existingSystemUser = await db.query.users.findFirst({
    where: eq(users.email, ADMIN_SYSTEM_USER_EMAIL),
  });

  if (existingSystemUser) {
    console.log("Admin system user already exists — skipping");
  } else {
    await db.insert(users).values({
      email: ADMIN_SYSTEM_USER_EMAIL,
      name: "MotoYaar Official",
      username: "motoyaar",
      isVerified: true,
    });
    console.log("Admin system user created: official@motoyaar.app");
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
