"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/utils/currency";

interface Props {
  initialCurrency?: string;
}

export function CurrencySetting({ initialCurrency }: Props = {}) {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);

  const currentCurrency = session?.user?.currency ?? initialCurrency ?? "INR";

  const handleChange = async (currency: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (!res.ok) throw new Error("API error");
      await update();
      toast.success("Currency updated");
    } catch {
      toast.error("Failed to update currency");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Currency</p>
        <p className="text-xs text-gray-500">Used for expense amounts and reports</p>
      </div>
      <Select value={currentCurrency} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
