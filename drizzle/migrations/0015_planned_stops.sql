-- Add planned_stops to trips: stores the user's intended route stops before a live trip.
-- Null when the user skipped route planning or for retrospective trips.
ALTER TABLE trips ADD COLUMN planned_stops JSONB;
