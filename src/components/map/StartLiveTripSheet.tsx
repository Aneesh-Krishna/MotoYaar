"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { X, Loader2, AlertTriangle, MapPin, Radio } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { checkGeolocationPermission } from "@/utils/geo";
import { buildOfflineNavCache, saveOfflineNavCache } from "@/lib/navCacheDb";
import { RoutePlanningStep } from "@/components/map/RoutePlanningStep";
import type { Trip, PlannedStop } from "@/types";

type SheetStep = "trip-selection" | "route-planning";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select an existing trip (from kebab menu) */
  preselectedTripId?: string;
}

export function StartLiveTripSheet({ open, onClose, preselectedTripId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<SheetStep>("trip-selection");
  const [tab, setTab] = useState<"existing" | "new">("existing");

  // Existing trip tab
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(
    preselectedTripId ?? ""
  );

  // New trip tab
  const [newTitle, setNewTitle] = useState("");

  // Shared
  const [permError, setPermError] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPermError(false);
    setOfflineBannerDismissed(false);
    setSelectedTripId(preselectedTripId ?? "");
    setNewTitle("");
    setStep("trip-selection");

    async function loadTrips() {
      setTripsLoading(true);
      try {
        const all = await apiRequest<Trip[]>("/trips");
        setTrips(all.filter((t) => !t.hasLiveRoute));
      } catch {
        toast.error("Could not load trips.");
      } finally {
        setTripsLoading(false);
      }
    }
    loadTrips();
  }, [open, preselectedTripId]);

  async function handleProceedToRouting() {
    if (tab === "existing") {
      if (!selectedTripId) return;
      setStep("route-planning");
    } else {
      if (!newTitle.trim()) return;
      setNavigating(true);
      try {
        const trip = await apiRequest<Trip>("/trips", {
          method: "POST",
          body: JSON.stringify({
            title: newTitle.trim(),
            startDate: new Date().toISOString().split("T")[0],
          }),
        });
        setSelectedTripId(trip.id);
        setStep("route-planning");
      } catch {
        toast.error("Failed to create trip. Try again.");
      } finally {
        setNavigating(false);
      }
    }
  }

  async function handleStartTripWithRoute(stops: PlannedStop[], routeData: any) {
    setSaving(true);
    const ok = await checkGeolocationPermission();
    if (!ok) {
      setPermError(true);
      setSaving(false);
      setStep("trip-selection");
      return;
    }
    try {
      await apiRequest(`/trips/${selectedTripId}/planned-stops`, {
        method: "PATCH",
        body: JSON.stringify({ plannedStops: stops }),
      });
      const cache = buildOfflineNavCache(selectedTripId, routeData, stops);
      await saveOfflineNavCache(cache);
    } catch {
      toast.error("Failed to save route. Try again.");
      setSaving(false);
      return;
    }
    onClose();
    router.push(`/trips/${selectedTripId}/live`);
  }

  async function handleSkip() {
    setNavigating(true);
    const ok = await checkGeolocationPermission();
    if (!ok) {
      setPermError(true);
      setNavigating(false);
      setStep("trip-selection");
      return;
    }
    toast("No route planned — navigation won't be available offline.", {
      duration: 4000,
    });
    onClose();
    router.push(`/trips/${selectedTripId}/live`);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {step === "trip-selection" && (
            <>
              <div className="flex items-center justify-between px-5 py-3">
                <DialogPrimitive.Title className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Radio size={16} className="text-orange-500" />
                  Start Live Trip
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X size={18} />
                </DialogPrimitive.Close>
              </div>

              {/* Permission error */}
              {permError && (
                <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  Location permission is required to track your trip. Please enable
                  it in your browser settings.
                </div>
              )}

              <TabsPrimitive.Root
                value={tab}
                onValueChange={(v) => setTab(v as "existing" | "new")}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <TabsPrimitive.List className="flex border-b border-gray-200 mx-5">
                  {(["existing", "new"] as const).map((t) => (
                    <TabsPrimitive.Trigger
                      key={t}
                      value={t}
                      className="flex-1 py-2 text-sm font-medium text-gray-500 data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 -mb-px"
                    >
                      {t === "existing" ? "Existing Trip" : "New Trip"}
                    </TabsPrimitive.Trigger>
                  ))}
                </TabsPrimitive.List>

                {/* Existing trips */}
                <TabsPrimitive.Content
                  value="existing"
                  className="flex-1 overflow-y-auto px-5 py-3"
                >
                  {tripsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                    </div>
                  ) : trips.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center text-gray-500">
                      <MapPin size={32} className="text-gray-300" />
                      <p className="text-sm">No trips available.</p>
                      <p className="text-xs">Create a new trip to start tracking.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {trips.map((trip) => (
                        <li key={trip.id}>
                          <button
                            onClick={() => setSelectedTripId(trip.id)}
                            className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                              selectedTripId === trip.id
                                ? "border-orange-400 bg-orange-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <p className="font-medium text-gray-900 truncate">
                              {trip.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {trip.startDate}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsPrimitive.Content>

                {/* New trip */}
                <TabsPrimitive.Content value="new" className="px-5 py-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Pune to Mumbai weekend run"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </TabsPrimitive.Content>
              </TabsPrimitive.Root>

              {/* Offline warning */}
              {!navigator.onLine && !offlineBannerDismissed && (
                <div className="mx-5 mb-2 flex flex-col gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-700" />
                    <p className="flex-1 text-sm text-amber-700">
                      You&apos;re offline. Route will be saved locally and sync when connected.
                    </p>
                    <button
                      onClick={() => setOfflineBannerDismissed(true)}
                      aria-label="Dismiss offline warning"
                      className="flex-shrink-0 text-amber-500 hover:text-amber-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {selectedTripId && (
                    <a
                      href={`/trips/${selectedTripId}`}
                      className="text-sm text-amber-600 underline hover:text-amber-800 self-start"
                    >
                      Download offline map before starting
                    </a>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="px-5 pb-6 pt-2">
                <button
                  onClick={handleProceedToRouting}
                  disabled={
                    navigating ||
                    (tab === "existing" && !selectedTripId) ||
                    (tab === "new" && !newTitle.trim())
                  }
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-full h-12 font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {navigating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Radio size={16} />
                  )}
                  {navigating ? "Creating…" : "Plan Route →"}
                </button>
              </div>
            </>
          )}

          {step === "route-planning" && (
            <RoutePlanningStep
              tripId={selectedTripId}
              saving={saving}
              onStartTrip={handleStartTripWithRoute}
              onSkip={handleSkip}
              onBack={() => setStep("trip-selection")}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
