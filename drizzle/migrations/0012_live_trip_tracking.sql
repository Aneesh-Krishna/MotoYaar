-- trip_routes: stores the full recorded GPS route for a trip
CREATE TABLE trip_routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  waypoints   JSONB NOT NULL DEFAULT '[]',
  distance_km NUMERIC(8,3),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_route_per_trip UNIQUE (trip_id)
);
CREATE INDEX idx_trip_routes_trip_id ON trip_routes(trip_id);

-- live_trip_sessions: group location-sharing session tied to a live trip
CREATE TABLE live_trip_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code  VARCHAR(6) NOT NULL UNIQUE,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ
);
CREATE INDEX idx_live_sessions_trip_id ON live_trip_sessions(trip_id);
CREATE INDEX idx_live_sessions_invite_code ON live_trip_sessions(invite_code);

-- live_trip_participants: tracks who has joined a live session
CREATE TABLE live_trip_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES live_trip_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,
  CONSTRAINT unique_participant_per_session UNIQUE (session_id, user_id)
);
CREATE INDEX idx_live_participants_session_id ON live_trip_participants(session_id);
CREATE INDEX idx_live_participants_user_id ON live_trip_participants(user_id);

-- Add has_live_route flag to trips for quick list rendering
ALTER TABLE trips ADD COLUMN has_live_route BOOLEAN NOT NULL DEFAULT false;
