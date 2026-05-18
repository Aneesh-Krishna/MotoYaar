"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/maps/stripHtml";

interface Props {
  route: google.maps.DirectionsResult;
  currentStepIndex: number;
}

export function DirectionsDrawer({ route, currentStepIndex }: Props) {
  const [expanded, setExpanded] = useState(false);
  const leg = route.routes[0]?.legs[0];
  const steps = leg?.steps ?? [];

  return (
    <div className="rounded-t-2xl bg-white shadow-lg">
      {/* Chevron: Down when collapsed (tap to open), Up when expanded (tap to close) — #12 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-gray-800">
          {steps.length} steps · {leg?.distance?.text}
        </span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <ul className="max-h-56 overflow-y-auto border-t border-gray-100 pb-safe">
          {steps.map((step, i) => {
            // Stable key from step coordinates (#13)
            const key = `${step.start_location.lat()}-${step.start_location.lng()}`;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  i === currentStepIndex && "bg-orange-50",
                  i < currentStepIndex && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold",
                    i === currentStepIndex
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    {stripHtml(step.instructions)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {step.distance?.text} · {step.duration?.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
