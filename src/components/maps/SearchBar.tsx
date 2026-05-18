"use client";

import { useEffect, useRef, useState } from "react";
import { openDB } from "idb";
import { consumeSessionToken, getSessionToken } from "@/lib/maps/sessionToken";
import { Search, X, Clock } from "lucide-react";

const IDB_NAME = "motoyaar-maps";
const IDB_STORE = "recent-searches";
const MAX_RECENT = 20;

// Cached at module level — one connection for the lifetime of the page (#10)
const dbPromise = openDB(IDB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(IDB_STORE, { keyPath: "id" });
  },
});

interface RecentSearch {
  id: string;
  description: string;
  placeId: string;
  lat: number;
  lng: number;
  savedAt: number;
}

interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
}

async function loadRecent(): Promise<RecentSearch[]> {
  const db = await dbPromise;
  const all = await db.getAll(IDB_STORE);
  return all.sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_RECENT);
}

async function saveRecent(item: RecentSearch): Promise<void> {
  const db = await dbPromise;
  // Single read → sort → trim → atomic clear+put prevents the count-race (#4)
  const all = await db.getAll(IDB_STORE);
  const survivors = all
    .sort((a, b) => b.savedAt - a.savedAt)
    .filter((r) => r.id !== item.id)   // remove duplicate if same place re-selected
    .slice(0, MAX_RECENT - 1);         // keep top N-1 to make room for new item

  const tx = db.transaction(IDB_STORE, "readwrite");
  await tx.store.clear();
  await Promise.all([...survivors.map((r) => tx.store.put(r)), tx.store.put(item)]);
  await tx.done;
}

interface Props {
  onPlaceSelect: (place: PlaceResult) => void;
}

export function SearchBar({ onPlaceSelect }: Props) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof google === "undefined") return;
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    if (placesNodeRef.current) {
      placesRef.current = new google.maps.places.PlacesService(placesNodeRef.current);
    }
    loadRecent().then(setRecents);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      autocompleteRef.current?.getPlacePredictions(
        {
          input: value,
          sessionToken: getSessionToken(),
          componentRestrictions: { country: "in" },
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 250);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const token = consumeSessionToken();
    placesRef.current?.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "formatted_address"],
        sessionToken: token,
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address ?? prediction.description;

        const recent: RecentSearch = {
          id: prediction.place_id,
          description: prediction.description,
          placeId: prediction.place_id,
          lat,
          lng,
          savedAt: Date.now(),
        };
        saveRecent(recent).then(() => loadRecent().then(setRecents));

        setQuery(prediction.description);
        setPredictions([]);
        setIsFocused(false);
        onPlaceSelect({ lat, lng, address });
      }
    );
  };

  const handleRecentSelect = (r: RecentSearch) => {
    setQuery(r.description);
    setPredictions([]);
    setIsFocused(false);
    onPlaceSelect({ lat: r.lat, lng: r.lng, address: r.description });
  };

  const showRecents = isFocused && query.trim() === "" && recents.length > 0;
  const showPredictions = isFocused && predictions.length > 0;

  return (
    <div className="relative">
      {/* Hidden div required by PlacesService for attribution */}
      <div ref={placesNodeRef} className="hidden" />

      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-lg">
        <Search size={18} className="shrink-0 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search places in India…"
          className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
        {query && (
          <button onClick={() => { setQuery(""); setPredictions([]); }}>
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {(showRecents || showPredictions) && (
        <ul className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-xl bg-white shadow-lg">
          {showRecents &&
            recents.map((r) => (
              <li key={r.id}>
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                  onClick={() => handleRecentSelect(r)}
                >
                  <Clock size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate text-gray-700">{r.description}</span>
                </button>
              </li>
            ))}
          {showPredictions &&
            predictions.map((p) => (
              <li key={p.place_id}>
                <button
                  className="flex w-full flex-col px-4 py-3 text-left hover:bg-gray-50"
                  onClick={() => handleSelect(p)}
                >
                  <span className="text-sm font-medium text-gray-800">
                    {p.structured_formatting.main_text}
                  </span>
                  <span className="text-xs text-gray-500">
                    {p.structured_formatting.secondary_text}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
