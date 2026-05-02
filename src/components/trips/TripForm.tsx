"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTripSchema, type CreateTripInput } from "@/lib/validations/trip";
import { createTrip } from "@/services/api/tripApi";
import { listVehicles } from "@/services/api/vehicleApi";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import type { Vehicle } from "@/types";

interface TripFormProps {
  vehicleId?: string;
  onSaved: (tripId: string) => void;
  onCancel: () => void;
}

const BREAKDOWN_CATEGORIES = ["Food", "Fuel", "Stay", "Toll", "Other"] as const;

export function TripForm({ vehicleId, onSaved, onCancel }: TripFormProps) {
  const { data: session } = useSession();
  const userCurrency = session?.user?.currency ?? "INR";
  const currencySymbol = getCurrencySymbol(userCurrency);
  const [isDateRange, setIsDateRange] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoVehiclePrompt, setShowNoVehiclePrompt] = useState(false);
  const [pendingData, setPendingData] = useState<CreateTripInput | null>(null);

  useEffect(() => {
    listVehicles().then(setVehicles).catch(console.error);
  }, []);

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: undefined,
      vehicleId: vehicleId,
      routeText: "",
      mapsLink: "",
      timeTaken: "",
      breakdown: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "breakdown",
  });

  const breakdown = form.watch("breakdown");
  const totalCost = breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = async (data: CreateTripInput) => {
    const hasAmounts = data.breakdown.reduce((sum, i) => sum + (i.amount || 0), 0) > 0;

    if (!data.vehicleId && hasAmounts) {
      setPendingData(data);
      setShowNoVehiclePrompt(true);
      return;
    }

    await submitTrip(data);
  };

  const submitTrip = async (data: CreateTripInput) => {
    setIsSubmitting(true);
    try {
      const trip = await createTrip(data);
      toast.success("Trip saved");
      onSaved(trip.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoVehicleConfirm = async () => {
    if (!pendingData) return;
    setShowNoVehiclePrompt(false);
    await submitTrip({ ...pendingData, createGeneralExpense: true });
    setPendingData(null);
  };

  const handleNoVehicleClose = () => {
    // Escape / "No, skip" → dismiss prompt, return user to form (no submission)
    setShowNoVehiclePrompt(false);
    setPendingData(null);
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4 p-4">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Pune to Mumbai Weekend Run"
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            placeholder="What was this trip about?"
            rows={2}
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 resize-none"
            {...form.register("description")}
          />
        </div>

        {/* Date */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Date Range</span>
              <Switch
                checked={isDateRange}
                onCheckedChange={(checked) => {
                  setIsDateRange(checked);
                  if (!checked) form.setValue("endDate", undefined);
                }}
              />
            </div>
          </div>
          {isDateRange ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  className="mt-0.5 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                  {...form.register("startDate")}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  className="mt-0.5 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                  {...form.register("endDate")}
                />
              </div>
            </div>
          ) : (
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
              {...form.register("startDate")}
            />
          )}
          {form.formState.errors.startDate && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.startDate.message}</p>
          )}
        </div>

        {/* Vehicle */}
        <div>
          <label className="text-sm font-medium text-gray-700">Vehicle</label>
          {vehicleId ? (
            <p className="mt-1 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {vehicles.find((v) => v.id === vehicleId)?.name ?? "This vehicle"}
            </p>
          ) : (
            <select
              className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
              value={form.watch("vehicleId") ?? ""}
              onChange={(e) =>
                form.setValue("vehicleId", e.target.value || undefined)
              }
            >
              <option value="">No vehicle (optional)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Route */}
        <div>
          <label className="text-sm font-medium text-gray-700">Route</label>
          <input
            type="text"
            placeholder="e.g. Pune → Expressway → Mumbai"
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
            {...form.register("routeText")}
          />
        </div>

        {/* Maps Link */}
        <div>
          <label className="text-sm font-medium text-gray-700">Maps Link</label>
          <input
            type="url"
            placeholder="https://maps.google.com/..."
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
            {...form.register("mapsLink")}
          />
          {form.formState.errors.mapsLink && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.mapsLink.message}</p>
          )}
        </div>

        {/* Time Taken */}
        <div>
          <label className="text-sm font-medium text-gray-700">Time Taken</label>
          <input
            type="text"
            placeholder="e.g. 02:30"
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
            {...form.register("timeTaken")}
          />
        </div>

        {/* Expense Breakdown */}
        <div>
          <label className="text-sm font-medium text-gray-700">Expense Breakdown</label>
          <div className="mt-2 space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <select
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 w-28"
                  {...form.register(`breakdown.${index}.category`)}
                >
                  {BREAKDOWN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    className="border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                    {...form.register(`breakdown.${index}.amount`, { valueAsNumber: true })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ category: "Fuel", amount: 0 })}
            className="text-sm text-orange-600 font-medium flex items-center gap-1 mt-2"
          >
            <Plus size={14} />
            Add category
          </button>
          {totalCost > 0 && (
            <p className="text-sm font-semibold text-right text-gray-800 mt-2">
              Total: {formatCurrency(totalCost, userCurrency)}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-500 text-white w-full py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : (
            "Save Trip"
          )}
        </button>
      </form>

      <ConfirmModal
        open={showNoVehiclePrompt}
        onClose={handleNoVehicleClose}
        onConfirm={handleNoVehicleConfirm}
        title="No vehicle linked"
        description="This trip has no vehicle linked. Add the total as a general expense?"
        confirmLabel="Yes, add expense"
        cancelLabel="No, skip"
        isDestructive={false}
        isLoading={isSubmitting}
      />
    </>
  );
}
