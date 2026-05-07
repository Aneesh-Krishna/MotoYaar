CREATE TABLE service_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type     TEXT NOT NULL,
  km_interval      INTEGER,
  day_interval     INTEGER,
  last_serviced_km INTEGER,
  last_serviced_at DATE,
  notified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_reminders_vehicle_id ON service_reminders(vehicle_id);
CREATE INDEX idx_service_reminders_user_id ON service_reminders(user_id);
