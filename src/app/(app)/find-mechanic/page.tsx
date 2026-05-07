"use client";

import { useState } from "react";
import { Search, Loader2, Star, MapPin } from "lucide-react";
import Link from "next/link";
import type { ServiceCenter } from "@/types";

export default function FindMechanicPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ServiceCenter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (city.trim()) params.set("city", city.trim());
      const res = await fetch(`/api/service-centers?${params.toString()}`);
      if (res.ok) {
        const data: ServiceCenter[] = await res.json();
        setResults(data);
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Find a Mechanic</h1>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by city…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Search"}
        </button>
      </form>

      {searched && !isSearching && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No service centers found.</p>
          ) : (
            results.map((sc) => (
              <Link
                key={sc.id}
                href={`/service-centers/${sc.id}`}
                className="block border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{sc.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                      <MapPin size={12} />
                      <span className="text-xs">{sc.city}</span>
                    </div>
                  </div>
                  {sc.avgRating != null && (
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-orange-400 text-orange-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {sc.avgRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">({sc.reviewCount})</span>
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
