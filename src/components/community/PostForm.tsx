"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef } from "react";
import { createPostSchema, type CreatePostInput } from "@/lib/validations/post";
import { cn } from "@/lib/utils";
import { X, ImagePlus } from "lucide-react";

const PREDEFINED_TAGS = [
  "Bikes",
  "Cars",
  "Mods",
  "Travel",
  "Maintenance",
  "Fuel",
  "Roads",
  "Events",
  "Help",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export interface PostFormProps {
  initialValues?: Partial<CreatePostInput>;
  onSubmit: (data: CreatePostInput) => Promise<void>;
  submitLabel?: string;
  loadingLabel?: string;
  onImageUpload: (file: File) => Promise<string>;
  clubId?: string;
  clubName?: string;
}

interface ImagePreview {
  objectUrl: string;
  key: string;
}

export function PostForm({
  initialValues,
  onSubmit,
  submitLabel = "Post",
  loadingLabel = "Posting…",
  onImageUpload,
  clubId,
  clubName,
}: PostFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema) as any, // zod optional+default fields cause resolver type mismatch
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      imageKeys: initialValues?.imageKeys ?? [],
      link: initialValues?.link ?? "",
      tags: initialValues?.tags ?? [],
      clubId: clubId ?? initialValues?.clubId,
    },
  });

  const selectedTags: string[] = watch("tags") ?? [];
  const descriptionValue: string = watch("description") ?? "";

  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTag(tag: string) {
    const current: string[] = watch("tags") ?? [];
    if (current.includes(tag)) {
      setValue("tags", current.filter((t) => t !== tag), { shouldValidate: true });
    } else if (current.length < 10) {
      setValue("tags", [...current, tag], { shouldValidate: true });
    }
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    const current: string[] = watch("tags") ?? [];
    if (!current.includes(trimmed) && current.length < 10) {
      setValue("tags", [...current, trimmed], { shouldValidate: true });
    }
    setCustomTagInput("");
  }

  function removeCustomTag(tag: string) {
    const current: string[] = watch("tags") ?? [];
    setValue("tags", current.filter((t) => t !== tag), { shouldValidate: true });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImageError(null);

    const remaining = 2 - imagePreviews.length;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setImageError("Only JPG and PNG images are allowed.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setImageError("Each image must be under 5 MB.");
        continue;
      }
      const objectUrl = URL.createObjectURL(file);
      try {
        const key = await onImageUpload(file);
        setImagePreviews((prev) => [...prev, { objectUrl, key }]);
        const currentKeys: string[] = watch("imageKeys") ?? [];
        setValue("imageKeys", [...currentKeys, key], { shouldValidate: true });
      } catch {
        setImageError("Image upload failed. Please try again.");
        URL.revokeObjectURL(objectUrl);
      }
    }
    e.target.value = "";
  }

  function removeImage(index: number) {
    const preview = imagePreviews[index];
    URL.revokeObjectURL(preview.objectUrl);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    setValue(
      "imageKeys",
      newPreviews.map((p) => p.key),
      { shouldValidate: true }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Club scope indicator */}
      {clubId && clubName && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
          <span className="font-medium">Posting to:</span>
          <span>{clubName}</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            errors.title && "border-destructive"
          )}
          placeholder="What's on your mind?"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Description <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <textarea
            id="description"
            className={cn(
              "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none",
              errors.description && "border-destructive"
            )}
            rows={4}
            maxLength={1000}
            placeholder="Share your experience, tip, or question..."
            {...register("description")}
          />
          <p className="text-right text-xs text-muted-foreground mt-1">
            {descriptionValue.length}/1000
          </p>
        </div>
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Tags</label>

        {/* Predefined chips */}
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                selectedTags.includes(tag)
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              )}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={
              customTagInput ? `Create tag: ${customTagInput}` : "Add custom tag…"
            }
            value={customTagInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomTagInput(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            Add
          </button>
        </div>

        {/* Custom tags as chips */}
        {selectedTags.filter((t) => !PREDEFINED_TAGS.includes(t)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags
              .filter((t) => !PREDEFINED_TAGS.includes(t))
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-orange-500 text-white border border-orange-500"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeCustomTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Link */}
      <div className="space-y-1.5">
        <label htmlFor="link" className="block text-sm font-medium text-foreground">
          Link <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <input
          id="link"
          type="url"
          className={cn(
            "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            errors.link && "border-destructive"
          )}
          placeholder="https://..."
          {...register("link")}
        />
        {errors.link && (
          <p className="text-xs text-destructive">{errors.link.message}</p>
        )}
      </div>

      {/* Images */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Images <span className="text-muted-foreground text-xs">(optional, max 2)</span>
        </label>

        {imageError && <p className="text-xs text-destructive">{imageError}</p>}

        {imagePreviews.length > 0 && (
          <div className="flex gap-3">
            {imagePreviews.map((preview, idx) => (
              <div key={preview.key} className="relative w-24 h-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.objectUrl}
                  alt={`Preview ${idx + 1}`}
                  className="w-24 h-24 object-cover rounded-md border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {imagePreviews.length < 2 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <ImagePlus size={16} />
              Add Image
            </button>
          </>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {isSubmitting ? loadingLabel : submitLabel}
      </button>
    </form>
  );
}
