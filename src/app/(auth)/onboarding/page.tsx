"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  bio: z.string().max(300).optional(),
  instagramLink: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
    },
  });

  // QA-2.2-03: session is null on first render; pre-fill name once session loads
  useEffect(() => {
    if (session?.user?.name && !getValues("name")) {
      reset({ name: session.user.name }, { keepValues: false, keepDefaultValues: false });
    }
  }, [session, reset, getValues]);

  const usernameValue = watch("username");

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    try {
      const res = await fetch(`/api/users/username-check?username=${encodeURIComponent(username)}`);
      const { available } = await res.json();
      setUsernameStatus(available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  }, []);

  useEffect(() => {
    if (!usernameValue) {
      setUsernameStatus("idle");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkUsername(usernameValue), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue, checkUsername]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadProfileImage = async (file: File): Promise<string> => {
    const res = await fetch("/api/uploads/profile-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const { uploadUrl, key } = await res.json();
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (usernameStatus !== "available") return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let profileImageUrl: string | null = null;
      if (profileImageFile) {
        try {
          profileImageUrl = await uploadProfileImage(profileImageFile);
        } catch {
          setSubmitError("Failed to upload profile image. Please try again.");
          return;
        }
      }

      const payload: Record<string, unknown> = {
        name: data.name,
        username: data.username,
        profileImageUrl,
      };
      if (data.bio) payload.bio = data.bio;
      if (data.instagramLink) payload.instagramLink = data.instagramLink;

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        const message = err?.error?.message ?? "Something went wrong. Please try again.";
        setSubmitError(message);
        return;
      }

      router.push("/onboarding/walkthrough");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    usernameStatus === "checking" ||
    usernameStatus === "taken" ||
    usernameStatus === "invalid" ||
    usernameStatus === "idle";

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border p-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Set up your profile</h1>
        <p className="text-text-secondary text-sm mb-6">Complete your MotoYaar identity to get started.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            >
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-alt flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              )}
            </button>
            <span className="text-xs text-text-secondary">
              {profileImagePreview ? "Tap to change photo" : "Add profile photo (optional)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name <span className="text-error">*</span>
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="Your display name"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Username <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                {...register("username")}
                type="text"
                placeholder="your_username"
                className="w-full px-3 py-2 pr-8 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <svg className="w-4 h-4 animate-spin text-text-secondary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {usernameStatus === "available" && (
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {usernameStatus === "taken" && (
                  <svg className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-error">{errors.username.message}</p>
            )}
            {!errors.username && usernameStatus === "taken" && (
              <p className="mt-1 text-xs text-error">Username taken</p>
            )}
            {!errors.username && usernameStatus === "available" && (
              <p className="mt-1 text-xs text-success">Username available</p>
            )}
          </div>

          {/* Add more details (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails((v) => !v)}
              className="flex items-center gap-1 text-sm text-primary font-medium focus:outline-none"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showMoreDetails ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Add more details
            </button>

            {showMoreDetails && (
              <div className="mt-4 space-y-4">
                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Bio</label>
                  <textarea
                    {...register("bio")}
                    placeholder="Tell riders about yourself..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.bio && (
                    <p className="mt-1 text-xs text-error">{errors.bio.message}</p>
                  )}
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Instagram link</label>
                  <input
                    {...register("instagramLink")}
                    type="url"
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.instagramLink && (
                    <p className="mt-1 text-xs text-error">{errors.instagramLink.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {isSubmitting ? "Setting up..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
