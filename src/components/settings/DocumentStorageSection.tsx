"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateSettings } from "@/services/api/userApi";

interface Props {
  currentPreference: "parse_only" | "full_storage";
}

export function DocumentStorageSection({ currentPreference }: Props) {
  const [pref, setPref] = useState(currentPreference);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    const newPref = checked ? "full_storage" : "parse_only";
    setIsSaving(true);
    try {
      await updateSettings({ documentStoragePreference: newPref });
      setPref(newPref);
      toast.success("Storage preference updated");
    } catch {
      toast.error("Failed to update preference");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800">Document Storage</h2>

      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4">
        <div className="flex-1 pr-4">
          <p className="font-medium text-sm text-gray-800">Store documents after parsing</p>
          <p className="text-xs text-gray-500 mt-0.5">
            When enabled, your document files are kept encrypted in secure cloud storage.
            You can view them anytime. They are deleted 10 days after expiry.
          </p>
        </div>
        <Switch
          checked={pref === "full_storage"}
          onCheckedChange={handleToggle}
          disabled={isSaving}
          aria-label="Enable document storage"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        {pref === "parse_only" ? (
          <p className="text-xs text-amber-700">
            <strong>Parse-only mode (default):</strong> We extract the expiry date and immediately
            delete your document. No file is stored. Most secure option.
          </p>
        ) : (
          <p className="text-xs text-amber-700">
            <strong>Full storage enabled:</strong> Your documents are stored encrypted on Cloudflare R2.
            Access is via time-limited signed URLs (15 min). Files are auto-deleted 10 days after expiry.
          </p>
        )}
      </div>
    </section>
  );
}
