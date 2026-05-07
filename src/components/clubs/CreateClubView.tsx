"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClubSchema, type CreateClubInput } from "@/lib/validations/club";
import { createClub } from "@/services/api/clubApi";
import { ArrowLeft } from "lucide-react";

export function CreateClubView() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateClubInput>({
    resolver: zodResolver(createClubSchema) as any,
    defaultValues: { joinPolicy: "approval" },
  });

  const onSubmit = async (data: CreateClubInput) => {
    try {
      const club = await createClub(data);
      router.push(`/clubs/${club.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create club";
      setError("root", { message: msg });
    }
  };

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">Create a Club</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1">Club Name *</label>
          <input
            {...register("name")}
            placeholder="e.g. Pune Riders"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1">City *</label>
          <input
            {...register("city")}
            placeholder="e.g. Pune"
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
          {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="What is this club about? (max 300 chars)"
            maxLength={300}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 resize-none"
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1">Join Policy</label>
          <select
            {...register("joinPolicy")}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600"
          >
            <option value="approval">Requires admin approval</option>
            <option value="open">Open — anyone with the link can join</option>
          </select>
        </div>

        {errors.root && (
          <p className="text-sm text-red-400 bg-red-950 rounded-lg px-3 py-2">{errors.root.message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create Club"}
        </button>
      </form>
    </div>
  );
}
