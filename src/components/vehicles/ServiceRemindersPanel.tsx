"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Trash2, CheckCircle, Plus } from "lucide-react";
import { SERVICE_REMINDER_DEFAULTS } from "@/lib/serviceReminderConstants";
import type { ServiceReminder } from "@/types";
import type { VehicleType } from "@/types";

interface Props {
  vehicleId: string;
  vehicleType: VehicleType;
}

interface ReminderForm {
  serviceType: string;
  customServiceType: string;
  kmInterval: string;
  dayInterval: string;
}

const EMPTY_FORM: ReminderForm = {
  serviceType: "",
  customServiceType: "",
  kmInterval: "",
  dayInterval: "",
};

function getDefaultIntervals(type: string, vehicleType: VehicleType) {
  const defaults = SERVICE_REMINDER_DEFAULTS.find((d) => d.type === type);
  if (!defaults) return { kmInterval: "", dayInterval: "" };

  let km = defaults.kmInterval;
  let day = defaults.dayInterval as number | null;

  if (vehicleType === "4-wheeler" && type === "Oil Change") {
    km = 10000;
    day = 365;
  }

  return {
    kmInterval: km != null ? String(km) : "",
    dayInterval: day != null ? String(day) : "",
  };
}

function formatDue(reminder: ServiceReminder): string {
  if (reminder.kmInterval && !reminder.lastServicedKm) {
    return `Due in ~${reminder.kmInterval} km (no odometer data yet)`;
  }
  if (reminder.kmInterval && reminder.lastServicedKm != null) {
    return `Every ${reminder.kmInterval.toLocaleString()} km`;
  }
  if (reminder.dayInterval) {
    return `Every ${reminder.dayInterval} days`;
  }
  return "";
}

export function ServiceRemindersPanel({ vehicleId, vehicleType }: Props) {
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReminderForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/reminders`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders);
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  function handleChipClick(type: string) {
    const { kmInterval, dayInterval } = getDefaultIntervals(type, vehicleType);
    setForm({ serviceType: type, customServiceType: "", kmInterval, dayInterval });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const serviceType =
      form.serviceType === "custom" ? form.customServiceType.trim() : form.serviceType;
    if (!serviceType) {
      setError("Service type is required");
      return;
    }

    const kmInterval = form.kmInterval ? parseInt(form.kmInterval) : null;
    const dayInterval = form.dayInterval ? parseInt(form.dayInterval) : null;

    if (!kmInterval && !dayInterval) {
      setError("At least one interval (km or days) is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, kmInterval, dayInterval }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.formErrors?.[0] ?? "Failed to add reminder");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchReminders();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reminderId: string) {
    setError(null);
    const res = await fetch(`/api/vehicles/${vehicleId}/reminders/${reminderId}`, { method: "DELETE" });
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } else {
      setError("Failed to delete reminder. Please try again.");
    }
  }

  async function handleServiced(reminderId: string) {
    setError(null);
    const res = await fetch(`/api/vehicles/${vehicleId}/reminders/${reminderId}`, {
      method: "PATCH",
    });
    if (res.ok) {
      const data = await res.json();
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? data.reminder : r)));
    } else {
      setError("Failed to mark as serviced. Please try again.");
    }
  }

  const defaultTypes = SERVICE_REMINDER_DEFAULTS.map((d) => d.type);
  const existingTypes = new Set(reminders.map((r) => r.serviceType));
  const availableChips = defaultTypes.filter((t) => !existingTypes.has(t));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-orange-500" />
          Service Reminders
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowForm(true);
              setError(null);
            }}
            className="flex items-center gap-1 text-sm text-orange-500 font-medium"
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      {error && !showForm && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Quick-add chips */}
      {!showForm && availableChips.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {availableChips.map((type) => (
              <button
                key={type}
                onClick={() => handleChipClick(type)}
                className="px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={form.serviceType}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setForm((f) => ({ ...f, serviceType: "custom", kmInterval: "", dayInterval: "" }));
                } else {
                  const { kmInterval, dayInterval } = getDefaultIntervals(val, vehicleType);
                  setForm((f) => ({ ...f, serviceType: val, kmInterval, dayInterval }));
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select…</option>
              {defaultTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>

          {form.serviceType === "custom" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom service name</label>
              <input
                type="text"
                value={form.customServiceType}
                onChange={(e) => setForm((f) => ({ ...f, customServiceType: e.target.value }))}
                placeholder="e.g. Brake fluid check"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                maxLength={100}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Every (km)</label>
              <input
                type="number"
                value={form.kmInterval}
                onChange={(e) => setForm((f) => ({ ...f, kmInterval: e.target.value }))}
                placeholder="e.g. 5000"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Every (days)</label>
              <input
                type="number"
                value={form.dayInterval}
                onChange={(e) => setForm((f) => ({ ...f, dayInterval: e.target.value }))}
                placeholder="e.g. 180"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Reminder"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reminder list */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No reminders yet. Add one to stay on top of maintenance.
        </p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.serviceType}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDue(r)}</p>
                {r.lastServicedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last serviced: {r.lastServicedAt}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleServiced(r.id)}
                  title="Mark as serviced"
                  className="text-green-500 hover:text-green-700"
                >
                  <CheckCircle size={18} />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  title="Delete reminder"
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
