"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Camera, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Schema ───────────────────────────────────────────────────────────────────

const editProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  bio: z.string().max(200, "Bio must be 200 characters or fewer").optional(),
  instagramLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "current";

// ─── Username indicator (module-scope — stable across renders) ────────────────

function UsernameIndicator({ status }: { status: UsernameStatus }) {
  if (status === "checking") return <Loader2 size={16} className="animate-spin text-foreground-muted" />;
  if (status === "available") return <CheckCircle size={16} className="text-green-500" />;
  if (status === "taken") return <XCircle size={16} className="text-red-500" />;
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProfileFormProps {
  user: {
    id: string;
    name: string;
    username: string;
    bio: string;
    profileImageUrl: string | null;
    instagramLink: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfileForm({ user }: EditProfileFormProps) {
  const router = useRouter();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.profileImageUrl);
  const [removeImage, setRemoveImage] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("current");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks any active blob URL so we can revoke it on change or unmount
  const blobUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user.name,
      username: user.username,
      bio: user.bio,
      instagramLink: user.instagramLink,
    },
  });

  const usernameValue = watch("username");
  const bioValue = watch("bio") ?? "";

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // ─── Username uniqueness check ──────────────────────────────────────────────

  const checkUsername = useCallback(
    async (username: string) => {
      if (username === user.username) {
        setUsernameStatus("current");
        return;
      }
      if (!username || username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      try {
        const res = await fetch(
          `/api/users/username-check?username=${encodeURIComponent(username)}`
        );
        const { available } = await res.json();
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    },
    [user.username]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkUsername(usernameValue ?? ""), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue, checkUsername]);

  // ─── Image handling ─────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      e.target.value = "";
      return;
    }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const newBlobUrl = URL.createObjectURL(file);
    blobUrlRef.current = newBlobUrl;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(newBlobUrl);
  }

  function handleRemoveImage() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── Upload profile image ────────────────────────────────────────────────────

  async function uploadProfileImage(file: File): Promise<string> {
    const res = await fetch("/api/uploads/profile-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, fileSize: file.size }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, key } = await res.json();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!putRes.ok) throw new Error("Failed to upload image");

    return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(data: EditProfileFormData) {
    if (usernameStatus === "taken") return;
    setIsSubmitting(true);
    try {
      let profileImageUrl: string | null | undefined = undefined;

      if (imageFile) {
        profileImageUrl = await uploadProfileImage(imageFile);
      } else if (removeImage) {
        profileImageUrl = null;
      }

      const payload: Record<string, unknown> = {
        name: data.name,
        username: data.username,
        bio: data.bio,                       // always send — empty string clears existing bio
        instagramLink: data.instagramLink || null,
      };
      if (profileImageUrl !== undefined) {
        payload.profileImageUrl = profileImageUrl;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message ?? "Failed to save profile. Please try again.");
        return;
      }

      toast.success("Profile updated!");
      router.push("/profile");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-screen bg-surface">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex justify-between items-center">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="text-foreground-muted font-medium text-sm"
        >
          ← Cancel
        </button>
        <h1 className="text-body font-semibold text-foreground">Edit Profile</h1>
        <button
          type="submit"
          disabled={isSubmitting || usernameStatus === "taken" || usernameStatus === "checking"}
          className="bg-primary text-white px-5 py-2 rounded-btn font-semibold text-sm disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex flex-col gap-6 px-4 py-6 max-w-screen-sm mx-auto w-full">

        {/* Profile image */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                  {user.name[0]}
                </span>
              )}
            </div>
            {/* Change button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md"
              aria-label="Change profile photo"
            >
              <Camera size={14} className="text-white" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary font-medium"
            >
              Change photo
            </button>
            {imagePreview && (
              <>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-red-500 font-medium flex items-center gap-1"
                >
                  <X size={12} />
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
            Name
          </label>
          <input
            {...register("name")}
            type="text"
            placeholder="Your name"
            className="w-full border border-border rounded-card px-4 py-3 text-body text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.name && (
            <p className="text-caption text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
            Username
          </label>
          <div className="relative">
            <input
              {...register("username")}
              type="text"
              placeholder="username"
              className="w-full border border-border rounded-card px-4 py-3 pr-10 text-body text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <UsernameIndicator status={usernameStatus} />
            </div>
          </div>
          {errors.username && (
            <p className="text-caption text-red-500">{errors.username.message}</p>
          )}
          {usernameStatus === "taken" && !errors.username && (
            <p className="text-caption text-red-500">Username already taken</p>
          )}
          {usernameStatus === "available" && (
            <p className="text-caption text-green-600">Username available</p>
          )}
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
              Bio
            </label>
            <span className={`text-caption ${bioValue.length > 200 ? "text-red-500" : "text-foreground-muted"}`}>
              {bioValue.length}/200
            </span>
          </div>
          <textarea
            {...register("bio")}
            placeholder="Tell the community about yourself…"
            rows={3}
            className="w-full border border-border rounded-card px-4 py-3 text-body text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          {errors.bio && (
            <p className="text-caption text-red-500">{errors.bio.message}</p>
          )}
        </div>

        {/* Instagram link */}
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-semibold text-foreground-muted uppercase tracking-wide">
            Instagram Link
          </label>
          <input
            {...register("instagramLink")}
            type="url"
            placeholder="https://instagram.com/yourhandle"
            className="w-full border border-border rounded-card px-4 py-3 text-body text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.instagramLink && (
            <p className="text-caption text-red-500">{errors.instagramLink.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}
