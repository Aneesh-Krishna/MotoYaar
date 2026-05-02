"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { CurrencySetting } from "@/components/settings/CurrencySetting";
import { DocumentStorageSection } from "@/components/settings/DocumentStorageSection";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  initialCurrency: string;
  initialNotificationWindowDays: number;
  initialEmailNotificationsEnabled: boolean;
  initialDocumentStoragePreference: "parse_only" | "full_storage";
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 mt-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
  );
}

function PrivacyPolicyLink() {
  return (
    <Link href="/privacy" className="w-full flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-700">Privacy Policy</p>
        <p className="text-xs text-gray-500">How we store and use your data</p>
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </Link>
  );
}

function DeleteStoredDocumentsAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/documents/stored", { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      toast.success(
        `Deleted ${data.deleted} stored document${data.deleted !== 1 ? "s" : ""}`
      );
      setIsOpen(false);
    } catch {
      toast.error("Failed to delete stored documents");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-700">Delete all stored documents</p>
          <p className="text-xs text-gray-500">Remove all document files from secure storage</p>
        </div>
        <ChevronRight size={16} className="text-gray-400" />
      </button>
      <ConfirmModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Delete all stored documents?"
        description="This will permanently delete all document files from secure storage. Extracted data (expiry dates, document types) will be kept. This cannot be undone."
        confirmLabel="Delete all"
        isLoading={isDeleting}
      />
    </>
  );
}

function DeleteAccountAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/users/me/delete", { method: "POST" });
      if (res.ok) {
        await signOut({ redirect: false });
        window.location.assign("/login?message=deleted");
      } else {
        throw new Error("Request failed");
      }
    } catch {
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-red-600">Delete my account</p>
          <p className="text-xs text-gray-500">Permanently delete all data</p>
        </div>
        <ChevronRight size={16} className="text-gray-400" />
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(v) => {
          if (!isDeleting) {
            setIsOpen(v);
            if (!v) setConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will permanently delete your account, all vehicles, documents, expenses,
              trips, and community posts. This action cannot be undone.
            </p>
            <p className="text-sm font-medium text-gray-700">Type DELETE to confirm:</p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
              disabled={confirmText !== "DELETE" || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsView({
  initialCurrency,
  initialNotificationWindowDays,
  initialEmailNotificationsEnabled,
  initialDocumentStoragePreference,
}: Props) {
  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-gray-900 px-4 py-4">Settings</h1>

      {/* General */}
      <SectionHeader title="General" />
      <div className="bg-white divide-y divide-gray-100 border-y border-gray-200">
        <CurrencySetting initialCurrency={initialCurrency} />
      </div>

      {/* Notifications */}
      <div className="mt-6">
        <NotificationsSection
          notificationWindowDays={initialNotificationWindowDays}
          emailNotificationsEnabled={initialEmailNotificationsEnabled}
        />
      </div>

      {/* Privacy & Data */}
      <SectionHeader title="Privacy & Data" />
      <div className="space-y-3">
        <DocumentStorageSection currentPreference={initialDocumentStoragePreference} />
        <div className="bg-white divide-y divide-gray-100 border-y border-gray-200">
          <PrivacyPolicyLink />
          <DeleteStoredDocumentsAction />
          <DeleteAccountAction />
        </div>
      </div>

      {/* Account */}
      <SectionHeader title="Account" />
      <div className="bg-white border-y border-gray-200">
        <SignOutButton />
      </div>
    </div>
  );
}
