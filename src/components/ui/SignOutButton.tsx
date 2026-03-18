"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-3 w-full bg-card rounded-card border border-border shadow-card p-4 hover:shadow-md transition-shadow text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <LogOut size={20} className="text-red-500" aria-hidden="true" />
      </div>
      <span className="flex-1 text-body font-semibold text-red-500">Sign Out</span>
    </button>
  );
}
