"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceCenter } from "@/types";

interface ServiceCenterPickerProps {
  value?: ServiceCenter | null;
  onChange: (sc: ServiceCenter | null) => void;
}

interface NewServiceCenterForm {
  name: string;
  city: string;
  pincode: string;
}

export function ServiceCenterPicker({ value, onChange }: ServiceCenterPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServiceCenter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewServiceCenterForm>({ name: "", city: "", pincode: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [newFormError, setNewFormError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/service-centers?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: ServiceCenter[] = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (sc: ServiceCenter) => {
    onChange(sc);
    setQuery("");
    setShowDropdown(false);
    setShowNewForm(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setShowNewForm(false);
  };

  const handleAddNew = () => {
    setShowNewForm(true);
    setNewForm({ name: query, city: "", pincode: "" });
    setNewFormError("");
    setShowDropdown(false);
    setQuery("");
  };

  const handleNewFormSave = async () => {
    if (!newForm.name.trim() || !newForm.city.trim()) {
      setNewFormError("Name and city are required");
      return;
    }
    setIsSaving(true);
    setNewFormError("");
    try {
      const res = await fetch("/api/service-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newForm.name.trim(), city: newForm.city.trim(), pincode: newForm.pincode.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created: ServiceCenter = await res.json();
      handleSelect(created);
    } catch {
      setNewFormError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (value) {
    return (
      <div className="mt-1 flex items-center justify-between border border-orange-300 bg-orange-50 rounded-lg px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{value.name}</p>
          <p className="text-xs text-gray-500">{value.city}</p>
        </div>
        <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {isSearching ? (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        ) : null}
        <input
          type="text"
          placeholder="Search service center…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelect(sc)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="text-sm font-medium text-gray-800">{sc.name}</p>
              <p className="text-xs text-gray-500">{sc.city}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddNew}
            className={cn(
              "w-full text-left px-3 py-2.5 flex items-center gap-2 text-orange-600 text-sm font-medium hover:bg-orange-50",
              results.length > 0 && "border-t border-gray-100"
            )}
          >
            <Plus size={14} />
            Add &ldquo;{query}&rdquo; as a new service center
          </button>
        </div>
      )}

      {!showDropdown && query.trim() && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={handleAddNew}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-orange-600 text-sm font-medium hover:bg-orange-50"
          >
            <Plus size={14} />
            Add &ldquo;{query}&rdquo; as a new service center
          </button>
        </div>
      )}

      {showNewForm && (
        <div className="mt-2 border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">New service center</p>
          <input
            type="text"
            placeholder="Name *"
            value={newForm.name}
            onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            placeholder="City *"
            value={newForm.city}
            onChange={(e) => setNewForm((f) => ({ ...f, city: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            placeholder="Pincode (optional)"
            value={newForm.pincode}
            onChange={(e) => setNewForm((f) => ({ ...f, pincode: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {newFormError && <p className="text-xs text-red-500">{newFormError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNewFormSave}
              disabled={isSaving}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setQuery(""); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
