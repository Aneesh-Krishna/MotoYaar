"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentEditForm } from "@/components/documents/DocumentEditForm";
import { deleteDocument } from "@/services/api/documentApi";
import type { Document } from "@/types";

interface DriverLicenseSectionProps {
  dlDoc: Document | null;
  storagePreference: "parse_only" | "full_storage";
}

export function DriverLicenseSection({ dlDoc, storagePreference }: DriverLicenseSectionProps) {
  const router = useRouter();
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!dlDoc) return;
    setIsDeleting(true);
    try {
      await deleteDocument(dlDoc.id);
      setShowDeleteModal(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-800">Driver&apos;s License</h2>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
        {dlDoc ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-gray-600" />
              <div>
                <p className="font-medium text-sm">Driver&apos;s License</p>
                <p className="text-xs text-gray-500">
                  {dlDoc.expiryDate
                    ? `Expires: ${format(new Date(dlDoc.expiryDate), "d MMM yyyy")}`
                    : "No expiry date"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={dlDoc.status} />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button aria-label="DL options" className="p-1">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    className="z-50 min-w-[140px] rounded-xl border border-gray-100 bg-white shadow-lg py-1 text-sm"
                  >
                    <DropdownMenu.Item
                      onSelect={() => setShowEditSheet(true)}
                      className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
                    >
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => setShowDeleteModal(true)}
                      className="flex items-center px-4 py-2.5 text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                    >
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-gray-300" />
              <p className="text-sm text-gray-500">Not uploaded</p>
            </div>
            <button
              onClick={() => setShowUploadSheet(true)}
              className="text-orange-600 text-sm font-medium"
            >
              Upload
            </button>
          </div>
        )}
      </div>

      {/* Upload sheet */}
      <BottomSheet
        open={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        title="Upload Driver's License"
      >
        <DocumentUpload
          mode="dl"
          storagePreference={storagePreference}
          onSuccess={() => {
            setShowUploadSheet(false);
            router.refresh();
          }}
        />
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title="Edit Driver's License"
      >
        {dlDoc && (
          <DocumentEditForm
            document={dlDoc}
            mode="dl"
            storagePreference={storagePreference}
            onSaved={() => {
              setShowEditSheet(false);
              router.refresh();
            }}
            onCancel={() => setShowEditSheet(false)}
          />
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Remove Driver's License?"
        description="Remove your Driver's License record? This cannot be undone."
        confirmLabel="Remove"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </section>
  );
}
