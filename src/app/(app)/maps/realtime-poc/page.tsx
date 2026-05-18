"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

interface PocEntry {
  ts: number;
  latencyMs: number;
}

export default function RealtimePocPage() {
  const [entries, setEntries] = useState<PocEntry[]>([]);
  const [status, setStatus] = useState("Connecting…");

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase.channel("poc-test-17-3");
    const sentAt: Record<number, number> = {};

    channel
      .on("broadcast", { event: "ping" }, (payload: { payload: { ts: number } }) => {
        const received = Date.now();
        const sent = sentAt[payload.payload.ts];
        const latencyMs = sent ? received - sent : -1;
        setEntries((prev) => [
          ...prev,
          { ts: payload.payload.ts, latencyMs },
        ]);
      })
      .subscribe((s) => {
        setStatus(s === "SUBSCRIBED" ? "Subscribed" : s);
        if (s === "SUBSCRIBED") {
          const ts = Date.now();
          sentAt[ts] = ts;
          channel.send({ type: "broadcast", event: "ping", payload: { ts } });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-2 text-xl font-bold">Supabase Realtime PoC (Story 17.3 gate)</h1>
      <p className="mb-4 text-sm text-gray-600">Status: <strong>{status}</strong></p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Waiting for broadcast…</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map((e, i) => (
            <li key={i} className="rounded bg-green-50 px-3 py-2">
              Received ping at {new Date(e.ts).toISOString()} — latency:{" "}
              <strong>{e.latencyMs}ms</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
