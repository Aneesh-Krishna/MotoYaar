"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";
import { useMapStore } from "@/stores/mapStore";
import { DARK_MAP_STYLE } from "@/lib/maps/mapStyles";
import { fetchDirections } from "@/lib/maps/directions";
import { SearchBar } from "./SearchBar";
import { NavigationHUD } from "./NavigationHUD";
import { DirectionsDrawer } from "./DirectionsDrawer";
import { SpeedBadge } from "./SpeedBadge";
import { MapTypeToggle } from "./MapTypeToggle";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India center
const DEFAULT_ZOOM = 5;
const REROUTE_COOLDOWN_MS = 15_000;

interface MapContainerProps {
  apiLoaded: boolean;
}

export function MapContainer({ apiLoaded }: MapContainerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastRerouteRef = useRef<number>(0);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

  const {
    isNavigating,
    currentRoute,
    currentStepIndex,
    mapType,
    isDarkMode,
    setDarkMode,
    startNavigation,
    advanceStep,
    stopNavigation,
    setSpeed,
    setGeoError,
    geoError,
  } = useMapStore();

  // Stable ref so watchPosition callback never captures stale closure values,
  // preventing watchPosition from being re-registered on every step advance (#6).
  const navStateRef = useRef({ currentRoute, currentStepIndex });
  const destinationRef = useRef<google.maps.LatLngLiteral | null>(null);
  useEffect(() => {
    navStateRef.current = { currentRoute, currentStepIndex };
  });

  // Detect system dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setDarkMode]);

  // Get initial user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setGeoError(null);
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(15);
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setGeoError("Location access denied. Enable it in your browser settings to use navigation.");
        } else {
          setGeoError("Unable to get your location. Check your GPS signal.");
        }
      }
    );
  }, [setGeoError]);

  // Single watchPosition for navigation — deps only on isNavigating (#6).
  // currentStepIndex, currentRoute, destination read via refs to avoid re-registration.
  useEffect(() => {
    if (!isNavigating || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);

        // Update speed in store so SpeedBadge reads from store, not its own watcher (#9)
        if (pos.coords.speed !== null) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        }

        const { currentRoute: route, currentStepIndex: stepIdx } = navStateRef.current;
        const destination = destinationRef.current;
        if (!route) return;

        const steps = route.routes[0]?.legs[0]?.steps ?? [];
        const nextStep = steps[stepIdx + 1];
        if (nextStep) {
          const dist = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(loc.lat, loc.lng),
            nextStep.start_location
          );
          if (dist < 50) advanceStep();
        }

        // Reroute on deviation >150m — with 15s cooldown to prevent storms (#2)
        const currentStep = steps[stepIdx];
        if (currentStep && destination) {
          const stepPath = currentStep.path ?? [];
          if (stepPath.length > 0) {
            const closestOnPath = stepPath.reduce((closest, point) => {
              const d = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(loc.lat, loc.lng),
                point
              );
              return d < closest ? d : closest;
            }, Infinity);

            const now = Date.now();
            if (closestOnPath > 150 && now - lastRerouteRef.current > REROUTE_COOLDOWN_MS) {
              lastRerouteRef.current = now;
              fetchDirections({
                origin: `${loc.lat},${loc.lng}`,
                destination: `${destination.lat},${destination.lng}`,
              })
                .then((result) => startNavigation(result as unknown as google.maps.DirectionsResult))
                .catch(() => {});
            }
          }
        }
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setGeoError("Location access denied. Enable it in your browser settings to use navigation.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSpeed(null);
    };
  }, [isNavigating, advanceStep, startNavigation, setSpeed, setGeoError]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handlePlaceSelect = useCallback(
    async (place: { lat: number; lng: number; address: string }) => {
      if (!userLocation) return;
      destinationRef.current = { lat: place.lat, lng: place.lng };
      try {
        const result = await fetchDirections({
          origin: `${userLocation.lat},${userLocation.lng}`,
          destination: `${place.lat},${place.lng}`,
        });
        startNavigation(result as unknown as google.maps.DirectionsResult);
        mapRef.current?.fitBounds(
          (result as unknown as google.maps.DirectionsResult).routes[0].bounds
        );
      } catch {
        // silent — user sees no route rendered
      }
    },
    [userLocation, startNavigation]
  );

  if (!apiLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={userLocation ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={handleMapLoad}
        options={{
          mapTypeId: mapType,
          minZoom: 5,
          maxZoom: 20,
          gestureHandling: "greedy",
          disableDefaultUI: true,
          zoomControl: true,
          styles: isDarkMode ? DARK_MAP_STYLE : [],
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#F97316",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
          />
        )}
        {currentRoute && (
          <DirectionsRenderer
            directions={currentRoute}
            options={{ suppressMarkers: false, preserveViewport: true }}
          />
        )}
      </GoogleMap>

      {/* Search bar overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 p-3">
        <SearchBar onPlaceSelect={handlePlaceSelect} />
      </div>

      {/* Map type toggle */}
      <div className="absolute right-3 top-20 z-10">
        <MapTypeToggle />
      </div>

      {/* Geolocation error banner (#14) */}
      {geoError && (
        <div className="absolute left-3 right-3 top-16 z-20 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
          {geoError}
        </div>
      )}

      {/* Navigation HUD */}
      {isNavigating && currentRoute && (
        <NavigationHUD route={currentRoute} stepIndex={currentStepIndex} />
      )}

      {/* Speed badge — reads from store, no second GPS watcher (#9) */}
      {isNavigating && <SpeedBadge />}

      {/* Directions drawer */}
      {isNavigating && currentRoute && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <DirectionsDrawer route={currentRoute} currentStepIndex={currentStepIndex} />
        </div>
      )}

      {/* Stop navigation button */}
      {isNavigating && (
        <button
          onClick={stopNavigation}
          className="absolute bottom-48 left-1/2 z-10 -translate-x-1/2 rounded-full bg-red-500 px-6 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Stop Navigation
        </button>
      )}
    </div>
  );
}
