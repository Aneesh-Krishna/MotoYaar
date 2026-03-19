"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { updateVehicleSchema, type UpdateVehicleInput } from "@/lib/validations/vehicle";
import { updateVehicle } from "@/services/api/vehicleApi";
import { ApiError } from "@/lib/api-client";
import type { Vehicle } from "@/types";

// Client-side form schema: coerces empty date strings to undefined so the
// date input (which emits "" when blank) doesn't silently block submission.
const editFormSchema = updateVehicleSchema.extend({
  purchasedAt: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  ),
});

export function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(vehicle.imageUrl ?? "");
  const [regConflictError, setRegConflictError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateVehicleInput>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: vehicle.name,
      type: vehicle.type,
      company: vehicle.company ?? "",
      model: vehicle.model ?? "",
      variant: vehicle.variant ?? "",
      color: vehicle.color ?? "",
      registrationNumber: vehicle.registrationNumber,
      purchasedAt: vehicle.purchasedAt ?? "",
      previousOwners: vehicle.previousOwners,
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setPendingFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function onSubmit(data: UpdateVehicleInput) {
    setRegConflictError(null);
    try {
      let imageUrl: string | undefined = vehicle.imageUrl ?? undefined;
      let imageKey: string | undefined;

      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const res = await fetch("/api/uploads/vehicle-image", { method: "POST", body: formData });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error("[vehicle-image] upload failed", res.status, errBody);
          toast.error("Image upload failed. Please try again.");
          return;
        }
        const uploaded = await res.json();
        imageUrl = uploaded.publicUrl;
        imageKey = uploaded.key;
      }

      await updateVehicle(vehicle.id, { ...data, imageUrl, imageKey });
      router.push(`/garage/${vehicle.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRegConflictError("You already have a vehicle with this registration number");
      } else {
        toast.error("Failed to update vehicle. Try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-screen bg-white">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <button
          type="button"
          onClick={() => router.push(`/garage/${vehicle.id}`)}
          className="text-gray-600 font-medium text-sm"
        >
          ← Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Vehicle Photo */}
        <div className="flex flex-col gap-3">
          <label className="block text-sm font-medium text-gray-700">Vehicle Photo</label>
          <div className="flex flex-col items-start gap-3">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="Vehicle" className="object-cover w-full h-full" />
              ) : (
                <Camera size={28} className="text-gray-300" />
              )}
            </div>
            <label className="cursor-pointer bg-white border border-orange-500 text-orange-500 px-4 py-2 rounded-lg font-semibold text-sm">
              {isSubmitting ? "Saving…" : "Change Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
            </label>
          </div>
        </div>

        {/* Vehicle Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {/* Vehicle Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("type")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">Select type…</option>
            <option value="2-wheeler">2-Wheeler</option>
            <option value="4-wheeler">4-Wheeler</option>
            <option value="truck">Truck</option>
            <option value="other">Other</option>
          </select>
          {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company / Make</label>
          <input
            {...register("company")}
            placeholder="e.g. Royal Enfield"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            {...register("model")}
            placeholder="e.g. Classic 350"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Variant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
          <input
            {...register("variant")}
            placeholder="e.g. Signals Edition"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            {...register("color")}
            placeholder="e.g. Gunmetal Grey"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Registration Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            {...register("registrationNumber")}
            placeholder="e.g. MH12AB1234"
            autoCapitalize="characters"
            style={{ textTransform: "uppercase" }}
            onBlur={(e) => setValue("registrationNumber", e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {errors.registrationNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.registrationNumber.message}</p>
          )}
          {regConflictError && (
            <p className="text-red-500 text-xs mt-1">{regConflictError}</p>
          )}
        </div>

        {/* Purchase Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register("purchasedAt")}
            type="date"
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Previous Owners */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Previous Owners <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            {...register("previousOwners", { valueAsNumber: true })}
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
    </form>
  );
}
