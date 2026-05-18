"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceCenter, FuelStation } from "@/types";

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface AutocompleteResponse {
  predictions: Prediction[];
}

type PickerMode = "service-center" | "fuel-station";

type PickerValue<M extends PickerMode> = M extends "service-center"
  ? ServiceCenter
  : FuelStation;

interface PlacePickerProps<M extends PickerMode> {
  mode: M;
  value?: PickerValue<M> | null;
  onChange: (v: PickerValue<M> | null) => void;
  placeholder?: string;
}

const MIN_QUERY_LEN = 3;
const DEBOUNCE_MS = 400;

function newSessionToken(): string {
  // Server-side autocomplete sessions: any opaque per-session string works.
  // crypto.randomUUID is browser-supported on all modern targets.
  return crypto.randomUUID();
}

function entityName(v: ServiceCenter | FuelStation): string {
  return v.name;
}

function entitySubtitle(v: ServiceCenter | FuelStation): string {
  if ("city" in v && v.city && v.city !== "Unknown") {
    return v.city;
  }
  return v.formattedAddress ?? "";
}

export function PlacePicker<M extends PickerMode>({
  mode,
  value,
  onChange,
  placeholder,
}: PlacePickerProps<M>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string>(newSessionToken());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const placesType = mode === "fuel-station" ? "gas_station" : "car_repair";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      setResults([]);
      setShowDropdown(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          input: trimmed,
          types: placesType,
          sessiontoken: sessionTokenRef.current,
        });
        const res = await fetch(`/api/maps/places/autocomplete?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 403) {
            setError("Search limit reached. Try again in a minute.");
          } else {
            setError("Search unavailable. Try again.");
          }
          setResults([]);
          setShowDropdown(false);
          return;
        }
        const data: AutocompleteResponse = await res.json();
        setResults(data.predictions ?? []);
        setShowDropdown(true);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError("Search unavailable. Try again.");
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [query, placesType]);

  const handleSelect = useCallback(
    async (pred: Prediction) => {
      setShowDropdown(false);
      setIsFetchingDetails(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          place_id: pred.place_id,
          entity: mode,
          sessiontoken: sessionTokenRef.current,
        });
        const res = await fetch(`/api/maps/places/details?${params.toString()}`);
        // Details closes the billing session — start a fresh token for next search
        sessionTokenRef.current = newSessionToken();
        if (!res.ok) {
          if (res.status === 403) {
            setError("Daily limit reached. Try again tomorrow.");
          } else {
            setError("Could not load place details.");
          }
          return;
        }
        const data: { entity: PickerValue<M> } = await res.json();
        onChange(data.entity);
        setQuery("");
      } catch {
        setError("Could not load place details.");
      } finally {
        setIsFetchingDetails(false);
      }
    },
    [mode, onChange]
  );

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setError(null);
  };

  if (value) {
    return (
      <div className="mt-1 flex items-center justify-between border border-orange-300 bg-orange-50 rounded-lg px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{entityName(value)}</p>
          <p className="text-xs text-gray-500 truncate">{entitySubtitle(value)}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
          aria-label="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const defaultPlaceholder =
    mode === "fuel-station" ? "Search fuel station…" : "Search service center…";

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {(isSearching || isFetchingDetails) && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
        <input
          type="text"
          placeholder={placeholder ?? defaultPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          maxLength={100}
          className="border border-gray-300 rounded-lg pl-9 pr-9 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
        />
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((pred) => (
            <button
              key={pred.place_id}
              type="button"
              onClick={() => handleSelect(pred)}
              disabled={isFetchingDetails}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2",
                isFetchingDetails && "opacity-50 cursor-wait"
              )}
            >
              <MapPin size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pred.main_text}</p>
                <p className="text-xs text-gray-500 truncate">{pred.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && !isSearching && query.trim().length >= MIN_QUERY_LEN && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5">
          <p className="text-sm text-gray-500">No places found.</p>
        </div>
      )}
    </div>
  );
}
