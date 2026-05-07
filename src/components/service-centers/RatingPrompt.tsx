"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ServiceCenter } from "@/types";

interface RatingPromptProps {
  serviceCenter: ServiceCenter;
  onDone: () => void;
}

export function RatingPrompt({ serviceCenter, onDone }: RatingPromptProps) {
  const [step, setStep] = useState<"prompt" | "form">("prompt");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-centers/${serviceCenter.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: reviewText.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      toast.success("Review submitted!");
      onDone();
    } catch {
      toast.error("Failed to submit review. You can rate later from the service center page.");
      onDone();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
        {step === "prompt" ? (
          <>
            <p className="text-base font-semibold text-gray-800">
              Rate {serviceCenter.name}?
            </p>
            <p className="text-sm text-gray-500 mt-1">Share your experience to help others find reliable mechanics.</p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold"
              >
                Rate Now
              </button>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium"
              >
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-gray-800 mb-3">
              Rate {serviceCenter.name}
            </p>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    size={32}
                    className={
                      star <= (hoveredStar || rating)
                        ? "fill-orange-400 text-orange-400"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Write a review (optional, max 100 chars)"
              maxLength={100}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{reviewText.length}/100</p>
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!rating || isSubmitting}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Submit"}
              </button>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
