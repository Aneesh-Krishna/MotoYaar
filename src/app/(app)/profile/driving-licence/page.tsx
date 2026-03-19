import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { documentService } from "@/services/documentService";
import { DriverLicenseSection } from "@/components/documents/DriverLicenseSection";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function DrivingLicencePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [dlDocuments, dbUser] = await Promise.all([
    documentService.listUserDocuments(session.user.id),
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
  ]);

  const dlDoc = dlDocuments.find((d) => d.type === "DL") ?? null;
  const storagePreference =
    (dbUser?.documentStoragePreference as "parse_only" | "full_storage") ?? "parse_only";

  return (
    <div className="px-screen-x py-5 space-y-5 max-w-screen-xl mx-auto lg:px-screen-x-md">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Profile
        </Link>
      </div>

      <h1 className="text-title font-bold text-foreground">Driver&apos;s License</h1>

      <DriverLicenseSection dlDoc={dlDoc} storagePreference={storagePreference} />
    </div>
  );
}
