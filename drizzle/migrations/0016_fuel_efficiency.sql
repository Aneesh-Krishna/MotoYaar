-- Add fuel efficiency tracking columns to expenses
ALTER TABLE expenses ADD COLUMN litres_filled NUMERIC(6,2);
ALTER TABLE expenses ADD COLUMN odometer_km   INTEGER;
ALTER TABLE expenses ADD COLUMN kmpl          NUMERIC(5,2);
