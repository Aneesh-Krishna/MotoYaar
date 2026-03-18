import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!session.user.username) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar — hidden on mobile */}
      <SidebarNav />

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  );
}
