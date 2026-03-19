"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { DocumentType } from "@/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

type UploadScreen = "upload" | "parsing" | "confirm" | "manual" | "complete";

interface ParseResult {
  extractedExpiryDate: string | null;
  documentType: string;
  confidence: string;
  parseStatus: string;
  tempR2Key: string;
}

interface DocumentUploadProps {
  vehicleId?: string;
  mode?: "vehicle" | "dl";
  storagePreference: "parse_only" | "full_storage";
  onSuccess: () => void;
}

export function DocumentUpload({
  vehicleId,
  mode = "vehicle",
  storagePreference,
  onSuccess,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<UploadScreen>("upload");
  const [docType, setDocType] = useState<DocumentType | "">(mode === "dl" ? "DL" : "");
  const [label, setLabel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual entry screen state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, or PDF files are supported.");
      if (fileInputRef.current) fileInputRef.current.value = ""; // MF-2
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = ""; // MF-2
      return;
    }
    if (mode === "vehicle" && !docType) {
      setError("Please select a document type first.");
      if (fileInputRef.current) fileInputRef.current.value = ""; // MF-2
      return;
    }

    setScreen("parsing");

    try {
      let uploadFile = file;

      // PDF → PNG conversion client-side
      if (file.type === "application/pdf") {
        const { pdfFirstPageToBlob } = await import("@/lib/pdfToImage");
        const blob = await pdfFirstPageToBlob(file);
        uploadFile = new File([blob], file.name.replace(/\.pdf$/i, ".png"), {
          type: "image/png",
        });
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      if (mode === "vehicle") formData.append("type", docType);

      const parseEndpoint =
        mode === "dl"
          ? "/api/users/me/documents/parse"
          : `/api/vehicles/${vehicleId}/documents/parse`;

      const res = await fetch(parseEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Parse failed");
      }

      const result: ParseResult = await res.json();
      setParseResult(result);

      if (result.extractedExpiryDate) {
        setExpiryDate(result.extractedExpiryDate);
        setScreen("confirm");
      } else {
        // No date extracted — transition to manual entry screen (AC: 1)
        setScreen("manual");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      if (fileInputRef.current) fileInputRef.current.value = ""; // MF-2
      setScreen("upload");
    }
  }

  async function handleSave() {
    if (!docType || !parseResult) return;
    setSaving(true);
    setError(null);

    const saveEndpoint =
      mode === "dl" ? "/api/users/me/documents" : `/api/vehicles/${vehicleId}/documents`;

    try {
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          label: docType === "Other" ? label : undefined,
          expiryDate: expiryDate || undefined,
          parseStatus: expiryDate
            ? parseResult.extractedExpiryDate
              ? "parsed"
              : "manual"
            : "incomplete",
          tempR2Key: parseResult.tempR2Key,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      setScreen("complete"); // SF-1: Screen 4 — save confirmation
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // AC: 4 — Save with date: parseStatus="manual"
  async function handleManualSave() {
    if (!selectedDate || !docType) return;
    setSaving(true);

    const saveEndpoint =
      mode === "dl" ? "/api/users/me/documents" : `/api/vehicles/${vehicleId}/documents`;

    try {
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          label: docType === "Other" ? label : undefined,
          expiryDate: format(selectedDate, "yyyy-MM-dd"),
          parseStatus: "manual",
          tempR2Key: parseResult?.tempR2Key ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      toast.success("Document saved");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // AC: 3 — Skip: parseStatus="incomplete", expiryDate=null
  async function handleSkip() {
    if (!docType) return;
    setSaving(true);

    const saveEndpoint =
      mode === "dl" ? "/api/users/me/documents" : `/api/vehicles/${vehicleId}/documents`;

    try {
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          label: docType === "Other" ? label : undefined,
          expiryDate: undefined, // null in DB
          parseStatus: "incomplete",
          tempR2Key: parseResult?.tempR2Key ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      toast.success("Document saved as incomplete");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Screen 1: Upload ──────────────────────────────────────────────────────
  if (screen === "upload") {
    return (
      <div className="flex flex-col gap-4 p-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {mode === "vehicle" && (
          <>
            <DocTypeSelect value={docType} onChange={setDocType} />
            {docType === "Other" && (
              <input
                type="text"
                placeholder="Label (e.g. Fitness Certificate)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center w-full hover:border-orange-400 transition-colors"
        >
          <Upload size={32} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Tap to upload or take a photo</p>
        </button>

        <p className="text-xs text-gray-400 text-center">JPG, PNG or PDF · Max 10MB</p>

        {/* SF-4: removed capture="environment" — allows both camera and gallery on mobile */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // ─── Screen 2: Parsing loading state ──────────────────────────────────────
  if (screen === "parsing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} className="text-orange-500" />
        </motion.div>
        <p className="font-semibold text-gray-800">Reading your document...</p>
        <p className="text-sm text-gray-500 text-center">
          Our AI is extracting the expiry date. This takes a few seconds.
        </p>
      </div>
    );
  }

  // ─── Screen 4 (manual): Manual expiry entry ───────────────────────────────
  // AC: 1, 7 — shown when AI returns no date OR user taps "Enter manually"
  if (screen === "manual") {
    return (
      <div className="flex flex-col gap-6 p-4">
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">Enter Expiry Date</h3>
          <p className="text-sm text-gray-500 mt-1">
            {parseResult && !parseResult.extractedExpiryDate
              ? "We couldn't read the date from your document."
              : "Enter the date manually."}
          </p>
        </div>

        {/* AC: 2 — shadcn Calendar inside Popover */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Expiry Date</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 border rounded-lg px-3 py-2 text-sm w-full",
                  !selectedDate && "text-gray-400"
                )}
              >
                <CalendarIcon size={16} />
                {/* AC: 2 — date formatted as "d MMMM yyyy" */}
                {selectedDate ? format(selectedDate, "d MMMM yyyy") : "Select date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              {/* Note: no fromDate constraint — past dates allowed (e.g. logging expired insurance) */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* AC: 4 — save with date → parseStatus="manual" */}
        <button
          onClick={handleManualSave}
          disabled={!selectedDate || saving}
          className="bg-orange-500 text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Save Document"}
        </button>

        {/* AC: 3 — skip → parseStatus="incomplete" */}
        <button
          onClick={handleSkip}
          disabled={saving}
          className="text-gray-500 text-sm underline text-center disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    );
  }

  // ─── Screen 5: Save confirmation ──────────────────────────────────────────
  if (screen === "complete") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <p className="font-semibold text-gray-800 text-lg">Document saved!</p>
        <p className="text-sm text-gray-500">
          {expiryDate
            ? `Expiry date set to ${expiryDate}.`
            : "Document added without an expiry date."}
        </p>
        <button
          onClick={onSuccess}
          className="bg-orange-500 text-white w-full py-3 rounded-lg font-semibold mt-2"
        >
          Done
        </button>
      </div>
    );
  }

  // ─── Screen 3: Confirmation ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      {parseResult?.extractedExpiryDate && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">Date extracted successfully</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Expiry Date</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <p className="text-xs text-gray-400">
        {storagePreference === "parse_only"
          ? "Your document will not be stored — only the expiry date is saved. "
          : "Your document will be stored securely. It auto-deletes 10 days after expiry. "}
        <Link href="/profile/settings" className="underline">
          Change in Settings
        </Link>
      </p>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-orange-500 text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Document"}
      </button>

      {/* AC: 1 — user can tap "Enter manually" from confirm screen → transitions to manual screen (AC: 7) */}
      <button
        onClick={() => setScreen("manual")}
        className="text-gray-500 text-sm underline text-center"
      >
        Enter date manually instead
      </button>
    </div>
  );
}

// ─── DocTypeSelect ─────────────────────────────────────────────────────────────
// Using a plain <select> for simplicity (Radix Select needs styling wrappers)

interface DocTypeSelectProps {
  value: DocumentType | "";
  onChange: (v: DocumentType) => void;
}

function DocTypeSelect({ value, onChange }: DocTypeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DocumentType)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
    >
      <option value="" disabled>
        Document type
      </option>
      <option value="RC">RC (Registration Certificate)</option>
      <option value="Insurance">Insurance</option>
      <option value="PUC">PUC (Pollution Certificate)</option>
      <option value="DL">DL (Driver&apos;s License)</option>
      <option value="Other">Other</option>
    </select>
  );
}
