-- Add guest_view_count to track concurrent guest viewers for each session
ALTER TABLE live_trip_sessions ADD COLUMN guest_view_count INTEGER NOT NULL DEFAULT 0;
