import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { LocalLiveTripState } from "@/types";

interface LiveTripDBSchema extends DBSchema {
  "live-trips": {
    key: string;
    value: LocalLiveTripState;
  };
}

let _db: IDBPDatabase<LiveTripDBSchema> | null = null;

export async function getLiveTripDb() {
  if (!_db) {
    _db = await openDB<LiveTripDBSchema>("motoyaar-live-trips", 1, {
      upgrade(db) {
        db.createObjectStore("live-trips");
      },
    });
  }
  return _db;
}

export async function saveLiveTripState(tripId: string, state: LocalLiveTripState) {
  const db = await getLiveTripDb();
  await db.put("live-trips", state, `live-trip-${tripId}`);
}

export async function getLiveTripState(tripId: string): Promise<LocalLiveTripState | undefined> {
  const db = await getLiveTripDb();
  return db.get("live-trips", `live-trip-${tripId}`);
}

export async function clearLiveTripState(tripId: string) {
  const db = await getLiveTripDb();
  await db.delete("live-trips", `live-trip-${tripId}`);
}
