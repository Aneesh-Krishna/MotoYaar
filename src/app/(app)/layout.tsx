import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";
import { FAB } from "@/components/layout/FAB";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!session.user.username) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Fixed top bar — mobile only */}
      <TopBar />

      {/* Fixed left sidebar — desktop only */}
      <SidebarNav />

      {/* Main content */}
      <main className="pt-14 pb-20 lg:pl-60 lg:pt-0 lg:pb-0">
        {children}
      </main>

      {/* Fixed bottom nav — mobile only */}
      <BottomNav />

      {/* Context-sensitive FAB */}
      <FAB />
    </div>
  );
}
