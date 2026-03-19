"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { updateVehicleSchema, type UpdateVehicleInput } from "@/lib/validations/vehicle";
import { updateVehicle } from "@/services/api/vehicleApi";
import { ApiError } from "@/lib/api-client";
import type { Vehicle } from "@/types";

export function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [regConflictError, setRegConflictError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateVehicleInput>({
    resolver: zodResolver(updateVehicleSchema),
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
      imageUrl: vehicle.imageUrl ?? "",
      imageKey: "",
    },
  });

  const imageUrl = watch("imageUrl");
  const imageKey = watch("imageKey");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    setUploading(true);
    try {
      // Delete old image if a new key was previously set (i.e., user already changed photo this session)
      if (imageKey) {
        await fetch(`/api/uploads/vehicle-image?key=${encodeURIComponent(imageKey)}`, {
          method: "DELETE",
        });
      }

      const res = await fetch("/api/uploads/vehicle-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key, publicUrl } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status}`);

      setValue("imageUrl", publicUrl);
      setValue("imageKey", key);
    } catch {
      toast.error("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: UpdateVehicleInput) {
    setRegConflictError(null);
    try {
      await updateVehicle(vehicle.id, { ...data, imageUrl: data.imageUrl || undefined });
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
          disabled={isSubmitting || uploading}
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
              {imageUrl ? (
                <Image src={imageUrl} alt="Vehicle" width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <Camera size={28} className="text-gray-300" />
              )}
            </div>
            <label className="cursor-pointer bg-white border border-orange-500 text-orange-500 px-4 py-2 rounded-lg font-semibold text-sm">
              {uploading ? "Uploading…" : "Change Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
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
