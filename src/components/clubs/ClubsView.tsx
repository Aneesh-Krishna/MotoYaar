"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Plus, X } from "lucide-react";
import { ClubCard } from "./ClubCard";
import { listClubs } from "@/services/api/clubApi";
import type { Club } from "@/types";

interface ClubsViewProps {
  currentUserId: string;
}

export function ClubsView({ currentUserId: _ }: ClubsViewProps) {
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listClubs()
      .then(setMyClubs)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setDebouncedQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (!debouncedQuery) { setSearchResults([]); return; }
    let cancelled = false;
    setIsSearching(true);
    listClubs(debouncedQuery)
      .then((results) => { if (!cancelled) setSearchResults(results); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const myClubIds = new Set(myClubs.map((c) => c.id));
  const discoverResults = searchResults.filter((c) => !myClubIds.has(c.id));

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Clubs</h1>
        <Link
          href="/community/clubs/new"
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Create
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search clubs by name or city…"
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-8 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        )}
      </div>

      {/* My clubs */}
      {!debouncedQuery && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">My Clubs</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-zinc-800 animate-pulse" />)}
            </div>
          ) : myClubs.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              You haven&apos;t joined any clubs yet.
            </p>
          ) : (
            <div className="space-y-2">
              {myClubs.map((club) => <ClubCard key={club.id} club={club} />)}
            </div>
          )}
        </section>
      )}

      {/* Search results */}
      {debouncedQuery && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 mb-2">
            {isSearching ? "Searching…" : `Results for "${debouncedQuery}"`}
          </h2>
          {!isSearching && discoverResults.length === 0 && (
            <p className="text-sm text-zinc-500 py-4 text-center">No clubs found.</p>
          )}
          <div className="space-y-2">
            {discoverResults.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        </section>
      )}
    </div>
  );
}
