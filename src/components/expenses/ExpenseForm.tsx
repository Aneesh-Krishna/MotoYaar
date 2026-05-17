"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, differenceInYears } from "date-fns";
import { AlertTriangle, Loader2, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import { createExpenseSchema, type CreateExpenseInput } from "@/lib/validations/expense";
import {
  createVehicleExpense,
  updateExpense,
  deleteExpense,
  getReceiptUrl,
  requestReceiptUploadUrl,
} from "@/services/api/expenseApi";
import { ApiError } from "@/lib/api-client";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ServiceCenterPicker } from "@/components/expenses/ServiceCenterPicker";
import { RatingPrompt } from "@/components/service-centers/RatingPrompt";
import type { Expense, ExpenseReason, ServiceCenter } from "@/types";

interface ExpenseFormProps {
  vehicleId?: string;
  vehicleName?: string;
  expense?: Expense;
  onSaved: () => void;
  onTripRedirect: () => void;
}

const REASONS: ExpenseReason[] = ["Service", "Fuel", "Trip", "Others"];
const EDIT_REASONS: ExpenseReason[] = ["Service", "Fuel", "Others"];
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB

export function ExpenseForm({ vehicleId, vehicleName, expense, onSaved, onTripRedirect }: ExpenseFormProps) {
  const { data: session } = useSession();
  const currencySymbol = getCurrencySymbol(session?.user?.currency ?? "INR");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedServiceCenter, setSelectedServiceCenter] = useState<ServiceCenter | null>(null);
  const [ratingPromptServiceCenter, setRatingPromptServiceCenter] = useState<ServiceCenter | null>(null);
  const isEditMode = !!expense;

  // Receipt state
  const [tempReceiptKey, setTempReceiptKey] = useState<string | undefined>(undefined);
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>(
    isEditMode && expense?.receiptKey ? expense.receiptKey.split("/").pop() : undefined
  );
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [removeReceipt, setRemoveReceipt] = useState(false);

  // Show "attached" UI when: new temp upload OR existing receipt in edit mode (and not removed)
  const hasExistingReceipt = isEditMode && !!expense?.receiptKey && !removeReceipt;
  const receiptPreview = hasExistingReceipt || !!tempReceiptKey;

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: isEditMode
      ? {
          price: expense.price,
          date: expense.date,
          reason: expense.reason,
          whereText: expense.whereText ?? "",
          comment: expense.comment,
          litresFilled: expense.litresFilled,
          odometerKm: expense.odometerKm,
        }
      : {
          price: undefined,
          date: format(new Date(), "yyyy-MM-dd"),
          reason: undefined,
          whereText: "",
          comment: undefined,
          litresFilled: undefined,
          odometerKm: undefined,
        },
  });

  const selectedReason = form.watch("reason");
  const watchedDate = form.watch("date");
  const isPastDateWarning = watchedDate
    ? differenceInYears(new Date(), parseISO(watchedDate)) >= 1
    : false;

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed");
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      toast.error("File must be under 5 MB");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const { uploadUrl, tempKey } = await requestReceiptUploadUrl(file.name, file.type);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      setTempReceiptKey(tempKey);
      setReceiptFileName(file.name);
      setRemoveReceipt(false);
      toast.success("Receipt attached");
    } catch {
      toast.error("Failed to upload receipt. Try again.");
    } finally {
      setIsUploadingReceipt(false);
      // Reset input so the same file can be re-selected if needed
      e.target.value = "";
    }
  };

  const handleViewReceipt = async () => {
    if (!expense?.id) return;
    try {
      const { signedUrl } = await getReceiptUrl(expense.id);
      window.open(signedUrl, "_blank");
    } catch {
      toast.error("Failed to open receipt");
    }
  };

  const handleRemoveReceipt = () => {
    if (tempReceiptKey) {
      setTempReceiptKey(undefined);
      setReceiptFileName(undefined);
    } else {
      setRemoveReceipt(true);
      setReceiptFileName(undefined);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense!.id);
      toast.success("Expense deleted");
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error("This expense is linked to a trip. Delete the trip to remove it.");
      } else {
        toast.error("Failed to delete expense. Try again.");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const onSubmit = async (data: CreateExpenseInput) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, serviceCenterId: selectedServiceCenter?.id };
      if (isEditMode) {
        await updateExpense(expense.id, {
          ...payload,
          tempReceiptKey,
          removeReceipt: removeReceipt || undefined,
        });
      } else if (vehicleId) {
        await createVehicleExpense(vehicleId, { ...payload, tempReceiptKey });
      }
      toast.success("Expense saved");
      if (data.reason === "Service" && selectedServiceCenter) {
        setRatingPromptServiceCenter(selectedServiceCenter);
      } else {
        onSaved();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trip-linked: show read-only indicator
  if (isEditMode && expense.tripId) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">Linked to a trip</p>
            <p className="text-sm text-amber-600 mt-0.5">
              This expense is linked to a trip. Edit it from the trip.
            </p>
            <Link href={`/trips/${expense.tripId}`} className="text-sm text-orange-600 font-medium underline mt-1 inline-block">
              Go to trip →
            </Link>
          </div>
        </div>
        <div className="space-y-2 opacity-60">
          <p className="text-sm"><span className="font-medium">Amount:</span> {formatCurrency(expense.price, session?.user?.currency ?? "INR")}</p>
          <p className="text-sm"><span className="font-medium">Date:</span> {format(parseISO(expense.date), "d MMM yyyy")}</p>
          <p className="text-sm"><span className="font-medium">Reason:</span> Trip</p>
        </div>
      </div>
    );
  }

  // Determine which reason chips to show
  const isTripReason = isEditMode && expense?.reason === "Trip";
  const visibleReasons = isEditMode ? EDIT_REASONS : REASONS;

  const inputClass = "mt-1.5 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-800 placeholder:text-gray-400";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 px-4 pb-6 pt-2">
      {/* Vehicle context — non-editable when pre-filled */}
      {vehicleId && (
        <div>
          <label className={labelClass}>Vehicle</label>
          <p className="mt-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
            {vehicleName ?? "This vehicle"}
          </p>
        </div>
      )}

      {/* Price + Date side by side */}
      <div className="flex gap-3">
        {/* Price */}
        <div className="flex-1">
          <label className={labelClass}>
            Amount <span className="text-red-400 normal-case tracking-normal">*</span>
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              className="border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-800 placeholder:text-gray-400"
              {...form.register("price", { valueAsNumber: true })}
            />
          </div>
          {form.formState.errors.price && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.price.message}</p>
          )}
        </div>

        {/* Date */}
        <div className="flex-1">
          <label className={labelClass}>
            Date <span className="text-red-400 normal-case tracking-normal">*</span>
          </label>
          <input
            type="date"
            max={format(new Date(), "yyyy-MM-dd")}
            className={inputClass}
            {...form.register("date")}
          />
          {form.formState.errors.date && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.date.message}</p>
          )}
        </div>
      </div>

      {isPastDateWarning && (
        <p className="text-xs text-amber-600 flex items-center gap-1 -mt-3">
          <AlertTriangle size={12} />
          This date seems far in the past — double-check?
        </p>
      )}

      {/* Reason chip selector */}
      <div>
        <label className={labelClass}>
          Reason <span className="text-red-400 normal-case tracking-normal">*</span>
        </label>
        <div className="flex gap-2 flex-wrap mt-2">
          {isTripReason ? (
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-xl text-sm font-semibold border bg-orange-500 text-white border-orange-500 opacity-60 cursor-not-allowed"
            >
              Trip
            </button>
          ) : (
            visibleReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (r === "Trip") {
                    form.reset();
                    onTripRedirect();
                    return;
                  }
                  form.setValue("reason", r, { shouldValidate: true });
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  selectedReason === r
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                )}
              >
                {r}
              </button>
            ))
          )}
        </div>
        {form.formState.errors.reason && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.reason.message}</p>
        )}
      </div>

      {/* Fuel-specific fields */}
      {selectedReason === "Fuel" && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Litres filled</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 12.5"
              step="0.1"
              className={inputClass}
              {...form.register("litresFilled", { valueAsNumber: true })}
            />
            {form.formState.errors.litresFilled && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.litresFilled.message}</p>
            )}
          </div>
          <div className="flex-1">
            <label className={labelClass}>Odometer (km)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 15240"
              className={inputClass}
              {...form.register("odometerKm", { valueAsNumber: true })}
            />
            {form.formState.errors.odometerKm && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.odometerKm.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Where (optional) — service center picker when reason=Service, else free-text */}
      <div>
        <label className={labelClass}>Where</label>
        {selectedReason === "Service" ? (
          <ServiceCenterPicker
            value={selectedServiceCenter}
            onChange={setSelectedServiceCenter}
          />
        ) : (
          <input
            type="text"
            placeholder="e.g. Raj Motors, Bangalore"
            className={inputClass}
            {...form.register("whereText")}
          />
        )}
      </div>

      {/* Comment (optional) */}
      <div>
        <label className={labelClass}>Your take</label>
        <select
          value={form.watch("comment") ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            form.setValue("comment", v ? (v as CreateExpenseInput["comment"]) : undefined);
          }}
          className={inputClass}
        >
          <option value="">Your take (optional)</option>
          <option value="Underpriced">Great deal (Underpriced)</option>
          <option value="Average">Fair price (Average)</option>
          <option value="Overpriced">Overpriced</option>
        </select>
      </div>

      {/* Receipt upload */}
      <div>
        {receiptPreview ? (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Paperclip size={15} className="text-orange-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate max-w-[150px]">{receiptFileName}</span>
            </div>
            <div className="flex items-center gap-3">
              {hasExistingReceipt && !tempReceiptKey && (
                <button
                  type="button"
                  onClick={handleViewReceipt}
                  className="text-xs text-orange-500 font-semibold"
                >
                  View
                </button>
              )}
              <label className="text-xs text-gray-500 cursor-pointer font-semibold">
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={handleReceiptSelect}
                  disabled={isUploadingReceipt}
                />
              </label>
              <button
                type="button"
                onClick={handleRemoveReceipt}
                className="text-xs text-red-500 font-semibold"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "border border-dashed border-gray-300 rounded-xl px-4 py-3 flex items-center gap-2.5 text-gray-400 cursor-pointer hover:border-orange-300 hover:text-orange-400 transition-colors",
              isUploadingReceipt && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploadingReceipt ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Paperclip size={15} />
            )}
            <span className="text-sm">
              {isUploadingReceipt ? "Uploading…" : "Attach receipt (optional)"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={handleReceiptSelect}
              disabled={isUploadingReceipt}
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isUploadingReceipt}
        className="bg-orange-500 text-white w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : isEditMode ? "Update Expense" : "Save Expense"}
      </button>

      {isEditMode && !expense.tripId && (
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full text-red-500 text-sm font-medium py-1 flex items-center justify-center gap-2"
        >
          <Trash2 size={15} />
          Delete Expense
        </button>
      )}

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete this expense?"
        description="This cannot be undone."
        confirmLabel="Delete Expense"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {ratingPromptServiceCenter && (
        <RatingPrompt
          serviceCenter={ratingPromptServiceCenter}
          onDone={() => {
            setRatingPromptServiceCenter(null);
            onSaved();
          }}
        />
      )}
    </form>
  );
}
