import { BottomNav } from "@/components/layout/BottomNav";
import { SidebarNav } from "@/components/layout/SidebarNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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