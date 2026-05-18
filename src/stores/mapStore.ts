"use client";

import { create } from "zustand";

export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";

interface MapStore {
  isNavigating: boolean;
  currentRoute: google.maps.DirectionsResult | null;
  currentStepIndex: number;
  isMuted: boolean;
  mapType: MapType;
  isDarkMode: boolean;
  speedKmh: number | null;
  geoError: string | null;

  startNavigation: (route: google.maps.DirectionsResult) => void;
  stopNavigation: () => void;
  advanceStep: () => void;
  toggleMute: () => void;
  setMapType: (type: MapType) => void;
  setDarkMode: (dark: boolean) => void;
  setSpeed: (kmh: number | null) => void;
  setGeoError: (msg: string | null) => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  isNavigating: false,
  currentRoute: null,
  currentStepIndex: 0,
  isMuted: false,
  mapType: "roadmap",
  isDarkMode: false,
  speedKmh: null,
  geoError: null,

  startNavigation: (route) =>
    set({ isNavigating: true, currentRoute: route, currentStepIndex: 0 }),

  stopNavigation: () =>
    set({ isNavigating: false, currentRoute: null, currentStepIndex: 0, speedKmh: null }),

  advanceStep: () => {
    const { currentRoute, currentStepIndex } = get();
    const steps = currentRoute?.routes[0]?.legs[0]?.steps?.length ?? 0;
    if (currentStepIndex < steps - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  setMapType: (type) => set({ mapType: type }),

  setDarkMode: (dark) => set({ isDarkMode: dark }),

  setSpeed: (kmh) => set({ speedKmh: kmh }),

  setGeoError: (msg) => set({ geoError: msg }),
}));
