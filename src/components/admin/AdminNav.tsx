import Link from "next/link";

interface AdminNavProps {
  pendingCount: number;
}

export function AdminNav({ pendingCount }: AdminNavProps) {
  return (
    <nav className="w-52 bg-gray-900 text-white min-h-screen p-4 flex flex-col gap-1 shrink-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
        Admin
      </p>
      <Link href="/admin" className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors">
        Dashboard
      </Link>
      <Link href="/admin/users" className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors">
        Users
      </Link>
      <Link href="/admin/community" className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors">
        Community
      </Link>
      <Link
        href="/admin/reported"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
      >
        Reported Posts
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
            {pendingCount}
          </span>
        )}
      </Link>
      <Link href="/admin/settings" className="px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors">
        Settings
      </Link>
    </nav>
  );
}
