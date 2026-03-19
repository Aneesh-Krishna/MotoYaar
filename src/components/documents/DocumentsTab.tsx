"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentEditForm } from "@/components/documents/DocumentEditForm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getSignedUrl, deleteDocument } from "@/services/api/documentApi";
import { toast } from "sonner";
import type { Document } from "@/types";

interface DocumentsTabProps {
  vehicleId: string;
  documents: Document[];
  storagePreference: "parse_only" | "full_storage";
}

export function DocumentsTab({ vehicleId, documents, storagePreference }: DocumentsTabProps) {
  const router = useRouter();
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = async (docId: string) => {
    const { signedUrl } = await getSignedUrl(docId);
    window.open(signedUrl, "_blank");
  };

  const handleEdit = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) setEditingDoc(doc);
  };

  const handleDelete = (id: string) => {
    setDeletingDocId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingDocId);
      setDeletingDocId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
          <FileText size={48} className="text-gray-300" aria-hidden="true" />
          <p className="text-gray-600 font-semibold">No documents yet</p>
          <p className="text-sm text-gray-500">
            Add your RC, Insurance, and PUC to get expiry alerts.
          </p>
          <button
            onClick={() => setShowUploadSheet(true)}
            className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
          >
            Add document
          </button>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                storagePreference={storagePreference}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            ))}
          </div>
          <div className="px-4 py-4">
            <button
              onClick={() => setShowUploadSheet(true)}
              className="w-full border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 flex items-center justify-center gap-2"
            >
              <Plus size={16} aria-hidden="true" />
              Add document
            </button>
          </div>
        </>
      )}

      <BottomSheet
        open={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        title="Add Document"
      >
        <DocumentUpload
          vehicleId={vehicleId}
          storagePreference={storagePreference}
          onSuccess={() => {
            setShowUploadSheet(false);
            router.refresh();
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="Edit Document"
      >
        {editingDoc && (
          <DocumentEditForm
            document={editingDoc}
            vehicleId={vehicleId}
            storagePreference={storagePreference}
            onSaved={() => {
              setEditingDoc(null);
              router.refresh();
            }}
            onCancel={() => setEditingDoc(null)}
          />
        )}
      </BottomSheet>

      <ConfirmModal
        open={!!deletingDocId}
        onClose={() => setDeletingDocId(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove this document?"
        description="This will permanently remove the document record. This cannot be undone."
        confirmLabel="Remove Document"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}
