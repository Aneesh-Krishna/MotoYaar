"use client";

import { useEffect } from "react";
import { useMapStore } from "@/stores/mapStore";
import { stripHtml } from "@/lib/maps/stripHtml";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  route: google.maps.DirectionsResult;
  stepIndex: number;
}

export function NavigationHUD({ route, stepIndex }: Props) {
  const { isMuted, toggleMute } = useMapStore();
  const leg = route.routes[0]?.legs[0];
  const steps = leg?.steps ?? [];
  const currentStep = steps[stepIndex];

  const instruction = currentStep
    ? stripHtml(currentStep.instructions)
    : "Follow the route";

  const distanceToNext = currentStep?.distance?.text ?? "";

  // Remaining ETA: sum duration of current step onward (#11)
  const remainingSeconds = steps
    .slice(stepIndex)
    .reduce((acc, s) => acc + (s.duration?.value ?? 0), 0);
  const eta = remainingSeconds > 0 ? `${Math.round(remainingSeconds / 60)} min` : (leg?.duration?.text ?? "");

  // Voice announcement
  useEffect(() => {
    if (isMuted || !currentStep || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [instruction, isMuted, currentStep]);

  return (
    <div className="absolute left-0 right-0 top-14 z-10 mx-3">
      <div className="flex items-center gap-3 rounded-xl bg-gray-900/90 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
        {/* Distance to next turn */}
        <span className="min-w-[3.5rem] text-sm font-bold text-orange-400">
          {distanceToNext}
        </span>

        {/* Instruction */}
        <p className="flex-1 text-sm font-medium leading-tight">{instruction}</p>

        {/* Remaining ETA badge */}
        <div className="flex flex-col items-center rounded-lg bg-orange-500 px-3 py-1">
          <span className="text-lg font-bold leading-none">{eta}</span>
          <span className="text-[0.6rem] font-medium uppercase tracking-wide opacity-80">ETA</span>
        </div>

        {/* Mute toggle */}
        <button onClick={toggleMute} className="ml-1 text-gray-300 hover:text-white">
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}
