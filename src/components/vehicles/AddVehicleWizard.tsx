"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Camera } from "lucide-react";
import { toast } from "sonner";
import { StepWizard } from "@/components/ui/StepWizard";
import { createVehicle } from "@/services/api/vehicleApi";
import { ApiError } from "@/lib/api-client";
import type { VehicleType } from "@/types";

// ─── Step schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["2-wheeler", "4-wheeler", "truck", "other"], {
    required_error: "Vehicle type is required",
  }),
});

const step2Schema = z.object({
  company: z.string().optional(),
  model: z.string().optional(),
  variant: z.string().optional(),
  color: z.string().optional(),
  registrationNumber: z.string().min(1, "Registration number is required"),
});

const step3Schema = z.object({
  purchasedAt: z.string().optional(),
  previousOwners: z.coerce.number().int().min(0),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardData {
  name: string;
  type: VehicleType | "";
  company: string;
  model: string;
  variant: string;
  color: string;
  registrationNumber: string;
  purchasedAt: string;
  previousOwners: number;
  /** Blob URL for local preview only — not sent to the server */
  imagePreviewUrl: string;
  /** The actual File object, uploaded to R2 on save */
  pendingImageFile: File | null;
}

const STEP_LABELS = ["Name & Type", "Details", "Ownership", "Photo", "Documents", "Review"];

const INITIAL_DATA: WizardData = {
  name: "",
  type: "",
  company: "",
  model: "",
  variant: "",
  color: "",
  registrationNumber: "",
  purchasedAt: "",
  previousOwners: 0,
  imagePreviewUrl: "",
  pendingImageFile: null,
};

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({
  defaultValues,
  onNext,
}: {
  defaultValues: Pick<WizardData, "name" | "type">;
  onNext: (data: Step1Data) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: defaultValues.name,
      type: defaultValues.type as Step1Data["type"] | undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vehicle Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          placeholder="e.g. Royal Enfield Classic 350"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

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
        {errors.type && (
          <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
        )}
      </div>

      <button
        type="submit"
        className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full"
      >
        Next
      </button>
    </form>
  );
}

function Step2({
  defaultValues,
  onNext,
}: {
  defaultValues: Pick<WizardData, "company" | "model" | "variant" | "color" | "registrationNumber">;
  onNext: (data: Step2Data) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-4">
      {[
        { name: "company" as const, label: "Company", placeholder: "e.g. Royal Enfield" },
        { name: "model" as const, label: "Model", placeholder: "e.g. Classic 350" },
        { name: "variant" as const, label: "Variant", placeholder: "e.g. Signals Edition" },
        { name: "color" as const, label: "Color", placeholder: "e.g. Gunmetal Grey" },
      ].map(({ name, label, placeholder }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input
            {...register(name)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      ))}

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
      </div>

      <button
        type="submit"
        className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full"
      >
        Next
      </button>
    </form>
  );
}

function Step3({
  defaultValues,
  onNext,
}: {
  defaultValues: Pick<WizardData, "purchasedAt" | "previousOwners">;
  onNext: (data: Step3Data) => void;
}) {
  const { register, handleSubmit } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      purchasedAt: defaultValues.purchasedAt || undefined,
      previousOwners: defaultValues.previousOwners,
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Previous Owners <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          {...register("previousOwners")}
          type="number"
          min={0}
          defaultValue={0}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <button
        type="submit"
        className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full"
      >
        Next
      </button>
    </form>
  );
}

function Step4({
  imagePreviewUrl,
  onNext,
  onImageSelected,
}: {
  imagePreviewUrl: string;
  onNext: () => void;
  onImageSelected: (file: File, previewUrl: string) => void;
}) {
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

    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 py-4">
        {imagePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreviewUrl}
            alt="Vehicle preview"
            className="w-full max-w-xs aspect-video rounded-lg object-cover bg-gray-100"
          />
        ) : (
          <div className="w-full max-w-xs aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
            <Camera size={40} className="text-gray-300" />
          </div>
        )}

        <label className="cursor-pointer bg-white border border-orange-500 text-orange-500 px-5 py-2.5 rounded-lg font-semibold text-sm w-full text-center">
          {imagePreviewUrl ? "Change Photo" : "Upload Photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <button
        onClick={onNext}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full"
      >
        {imagePreviewUrl ? "Next" : "Skip"}
      </button>
    </div>
  );
}

function Step5({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <FileText size={48} className="text-gray-300" />
      <h3 className="font-semibold text-lg">Documents</h3>
      <p className="text-sm text-gray-500">
        Save your vehicle first, then add your RC, Insurance, and PUC.
        You&apos;ll land on the Documents tab right after saving.
      </p>
      <button
        onClick={onNext}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full"
      >
        Continue to Review
      </button>
      <button onClick={onNext} className="text-gray-500 text-sm underline">
        Skip for now
      </button>
    </div>
  );
}

function Step6({
  data,
  onEdit,
  onSave,
  conflictError,
}: {
  data: WizardData;
  onEdit: (step: number) => void;
  onSave: () => Promise<void>;
  conflictError: string | null;
  saving?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  const TYPE_LABEL: Record<string, string> = {
    "2-wheeler": "2-Wheeler",
    "4-wheeler": "4-Wheeler",
    truck: "Truck",
    other: "Other",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Basics */}
      <ReviewSection title="Basics" onEdit={() => onEdit(0)}>
        <ReviewRow label="Name" value={data.name} />
        <ReviewRow label="Type" value={TYPE_LABEL[data.type] ?? data.type} />
      </ReviewSection>

      {/* Details */}
      <ReviewSection title="Details" onEdit={() => onEdit(1)}>
        {data.company && <ReviewRow label="Company" value={data.company} />}
        {data.model && <ReviewRow label="Model" value={data.model} />}
        {data.variant && <ReviewRow label="Variant" value={data.variant} />}
        {data.color && <ReviewRow label="Color" value={data.color} />}
        <ReviewRow label="Reg. Number" value={data.registrationNumber} />
        {conflictError && (
          <p className="text-red-500 text-xs mt-1">{conflictError}</p>
        )}
      </ReviewSection>

      {/* Ownership */}
      <ReviewSection title="Ownership" onEdit={() => onEdit(2)}>
        <ReviewRow
          label="Purchase Date"
          value={data.purchasedAt ? formatDate(data.purchasedAt) : "—"}
        />
        <ReviewRow label="Previous Owners" value={String(data.previousOwners)} />
      </ReviewSection>

      {/* Photo */}
      <ReviewSection title="Photo" onEdit={() => onEdit(3)}>
        {data.imagePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imagePreviewUrl}
            alt="Vehicle preview"
            className="w-24 h-16 rounded object-cover bg-gray-100 mt-1"
          />
        ) : (
          <p className="text-sm text-gray-400">No photo</p>
        )}
      </ReviewSection>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold w-full disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Vehicle"}
      </button>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-sm text-gray-900">{title}</span>
        <button onClick={onEdit} className="text-orange-500 text-sm font-medium">
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 min-w-[110px]">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function AddVehicleWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_DATA);
  const [conflictError, setConflictError] = useState<string | null>(null);

  function goToNextStep() {
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleClose() {
    router.push("/garage");
  }

  function handleStep1(data: Step1Data) {
    setWizardData((prev) => ({ ...prev, ...data }));
    goToNextStep();
  }

  function handleStep2(data: Step2Data) {
    setWizardData((prev) => ({
      ...prev,
      ...data,
      registrationNumber: data.registrationNumber.toUpperCase(),
    }));
    goToNextStep();
  }

  function handleStep3(data: Step3Data) {
    setWizardData((prev) => ({ ...prev, ...data }));
    goToNextStep();
  }

  function handleImageSelected(file: File, previewUrl: string) {
    setWizardData((prev) => ({ ...prev, pendingImageFile: file, imagePreviewUrl: previewUrl }));
  }

  async function handleSave() {
    setConflictError(null);
    try {
      let imageUrl: string | undefined;
      let imageKey: string | undefined;

      if (wizardData.pendingImageFile) {
        const formData = new FormData();
        formData.append("file", wizardData.pendingImageFile);
        const res = await fetch("/api/uploads/vehicle-image", { method: "POST", body: formData });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error("[vehicle-image] upload failed", res.status, errBody);
          toast.error("Image upload failed. Please try again.");
          return;
        }
        const data = await res.json();
        imageUrl = data.publicUrl;
        imageKey = data.key;
      }

      const payload = {
        name: wizardData.name,
        type: wizardData.type as VehicleType,
        company: wizardData.company || undefined,
        model: wizardData.model || undefined,
        variant: wizardData.variant || undefined,
        color: wizardData.color || undefined,
        registrationNumber: wizardData.registrationNumber,
        purchasedAt: wizardData.purchasedAt || undefined,
        previousOwners: wizardData.previousOwners,
        imageUrl,
        imageKey,
      };
      const vehicle = await createVehicle(payload);
      // Open the documents tab directly so user can add documents immediately
      router.push(`/garage/${vehicle.id}?tab=documents`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError("You already have a vehicle with this registration number");
      } else {
        toast.error("Failed to save vehicle. Try again.");
      }
    }
  }

  const steps = (
    <>
      {step === 0 && (
        <Step1
          defaultValues={{ name: wizardData.name, type: wizardData.type }}
          onNext={handleStep1}
        />
      )}
      {step === 1 && (
        <Step2
          defaultValues={{
            company: wizardData.company,
            model: wizardData.model,
            variant: wizardData.variant,
            color: wizardData.color,
            registrationNumber: wizardData.registrationNumber,
          }}
          onNext={handleStep2}
        />
      )}
      {step === 2 && (
        <Step3
          defaultValues={{
            purchasedAt: wizardData.purchasedAt,
            previousOwners: wizardData.previousOwners,
          }}
          onNext={handleStep3}
        />
      )}
      {step === 3 && (
        <Step4
          imagePreviewUrl={wizardData.imagePreviewUrl}
          onNext={goToNextStep}
          onImageSelected={handleImageSelected}
        />
      )}
      {step === 4 && <Step5 onNext={goToNextStep} />}
      {step === 5 && (
        <Step6
          data={wizardData}
          onEdit={(targetStep) => setStep(targetStep)}
          onSave={handleSave}
          conflictError={conflictError}
        />
      )}
    </>
  );

  return (
    <StepWizard
      steps={STEP_LABELS}
      currentStep={step}
      onBack={goBack}
      onClose={handleClose}
    >
      {steps}
    </StepWizard>
  );
}
