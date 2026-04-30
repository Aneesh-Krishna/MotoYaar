"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Car, Clock, ChevronRight, Download } from "lucide-react";
import { formatINR } from "@/utils/currency";
import OfflineMapsSection from "@/components/map/OfflineMapsSection";
import type { Trip, Expense } from "@/types";

const OfflineMapSheet = dynamic(() => import("@/components/map/OfflineMapSheet"), {
  ssr: false,
});

interface Props {
  trip: Trip;
  linkedExpense: Expense | null;
}

export default function TripOverviewTab({ trip, linkedExpense }: Props) {
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const totalCost = trip.breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      {trip.description && (
        <p className="text-gray-700 text-sm">{trip.description}</p>
      )}

      {(trip.routeText || trip.mapsLink) && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase">Route</p>
          {trip.routeText && (
            <p className="text-sm text-gray-800">{trip.routeText}</p>
          )}
          {trip.mapsLink && /^https?:\/\//.test(trip.mapsLink) && (
            <a
              href={trip.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 underline flex items-center gap-1"
            >
              <MapPin size={14} />
              View on Maps
            </a>
          )}
        </div>
      )}

      <button
        onClick={() => setShowDownloadSheet(true)}
        className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-100"
      >
        <Download size={16} />
        Download map for offline use
      </button>

      {showDownloadSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Download Offline Map</h2>
              <button
                onClick={() => setShowDownloadSheet(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <OfflineMapSheet
              tripId={trip.id}
              onComplete={() => {
                setShowDownloadSheet(false);
              }}
            />
          </div>
        </div>
      )}

      {trip.vehicle && (
        <Link
          href={`/garage/${trip.vehicle.id}`}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600"
        >
          <Car size={16} />
          {trip.vehicle.name}
          <ChevronRight size={14} className="text-gray-400" />
        </Link>
      )}

      {trip.timeTaken && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Duration: {trip.timeTaken}
        </p>
      )}

      <div className="bg-orange-50 rounded-xl px-4 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase">Total Cost</p>
        <p className="text-2xl font-bold text-orange-600 mt-1">
          {formatINR(totalCost)}
        </p>
      </div>

      {trip.breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <p className="px-4 py-3 text-xs font-medium text-gray-400 uppercase border-b">
            Breakdown
          </p>
          {trip.breakdown.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-4 py-2.5 border-b last:border-0"
            >
              <span className="text-sm text-gray-700">{item.category}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatINR(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <OfflineMapsSection tripId={trip.id} />

      {linkedExpense && (
        <span className="text-sm text-gray-500 underline cursor-default">
          View linked expense entry
        </span>
      )}
    </div>
  );
}
