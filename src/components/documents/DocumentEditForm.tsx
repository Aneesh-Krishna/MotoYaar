"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { updateDocument, deleteDocument } from "@/services/api/documentApi";
import type { Document, DocumentType } from "@/types";

interface DocumentEditFormProps {
  document: Document;
  vehicleId?: string;
  mode?: "vehicle" | "dl";
  storagePreference: "parse_only" | "full_storage";
  onSaved: () => void;
  onCancel: () => void;
}

const DOC_TYPES: DocumentType[] = ["RC", "Insurance", "PUC", "DL", "Other"];

export function DocumentEditForm({
  document,
  vehicleId,
  mode = "vehicle",
  storagePreference,
  onSaved,
  onCancel,
}: DocumentEditFormProps) {
  const [docType, setDocType] = useState<DocumentType>(document.type);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    document.expiryDate ? new Date(document.expiryDate) : undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showReupload, setShowReupload] = useState(false);

  const handleClearDate = () => setSelectedDate(undefined);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDocument(document.id, {
        type: docType,
        expiryDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
      });
      toast.success("Document updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (showReupload) {
    return (
      <DocumentUpload
        vehicleId={vehicleId}
        mode={mode}
        storagePreference={storagePreference}
        onSuccess={async () => {
          await deleteDocument(document.id).catch(() => {
            // Best-effort: log but don't block — new document is already saved
          });
          onSaved();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="font-semibold text-gray-800">Edit Document</h3>

      {/* Document Type — hidden for DL (type is locked) */}
      {mode === "vehicle" && (
        <div>
          <label className="text-sm font-medium text-gray-700">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Expiry Date */}
      <div>
        <label className="text-sm font-medium text-gray-700">Expiry Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <button className="mt-1 flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full text-left">
              <CalendarIcon size={16} className="text-gray-400" />
              {selectedDate ? format(selectedDate, "d MMMM yyyy") : <span className="text-gray-400">Select date</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} autoFocus />
          </PopoverContent>
        </Popover>
        <button
          className="text-xs text-gray-400 underline mt-1"
          onClick={handleClearDate}
          type="button"
        >
          Remove expiry date
        </button>
      </div>

      {/* Re-upload option */}
      <div className="border border-dashed border-gray-300 rounded-lg px-4 py-3 text-center">
        <button
          type="button"
          className="text-sm text-orange-600 font-medium flex items-center gap-2 mx-auto"
          onClick={() => setShowReupload(true)}
        >
          <RotateCcw size={14} />
          Replace with new file (re-scan with AI)
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-orange-500 text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Save Changes"}
      </button>
      <button onClick={onCancel} className="text-gray-500 text-sm text-center" type="button">
        Cancel
      </button>
    </div>
  );
}
