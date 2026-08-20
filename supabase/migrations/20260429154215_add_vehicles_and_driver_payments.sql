/*
  # Add Vehicles and Driver Payments

  ## Summary
  This migration adds two new features: vehicle management and driver payment tracking.

  ## New Tables

  ### `vehicles`
  Stores the fleet of vehicles.
  - `id` (uuid, PK)
  - `registration` (text, unique) — vehicle registration plate
  - `make_model` (text) — optional description e.g. "Ford Transit"
  - `created_at` (timestamp)

  ### `driver_payments`
  Records cash payments made to drivers, used to calculate their outstanding balance.
  - `id` (uuid, PK)
  - `driver_id` (uuid, FK → drivers, cascade delete)
  - `amount` (numeric) — payment amount in GBP
  - `payment_date` (date)
  - `note` (text, optional)
  - `created_at` (timestamp)

  ## Modified Tables

  ### `expenses`
  - Added `vehicle_reg` (text, nullable) — links an expense to a vehicle registration

  ## Security
  - RLS enabled on all new tables
  - Policies allow anon and authenticated access (internal tool, no user auth)

  ## Notes
  1. `vehicle_reg` on expenses is nullable to preserve existing records
  2. Driver payments cascade-delete when a driver is removed
*/

-- vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text UNIQUE NOT NULL,
  make_model text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on vehicles"
  ON vehicles FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on vehicles"
  ON vehicles FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on vehicles"
  ON vehicles FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on vehicles"
  ON vehicles FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated select on vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on vehicles"
  ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on vehicles"
  ON vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on vehicles"
  ON vehicles FOR DELETE TO authenticated USING (true);

-- driver_payments table
CREATE TABLE IF NOT EXISTS driver_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on driver_payments"
  ON driver_payments FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on driver_payments"
  ON driver_payments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on driver_payments"
  ON driver_payments FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on driver_payments"
  ON driver_payments FOR DELETE TO anon USING (true);

CREATE POLICY "Allow authenticated select on driver_payments"
  ON driver_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on driver_payments"
  ON driver_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on driver_payments"
  ON driver_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on driver_payments"
  ON driver_payments FOR DELETE TO authenticated USING (true);

-- Add vehicle_reg column to expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'vehicle_reg'
  ) THEN
    ALTER TABLE expenses ADD COLUMN vehicle_reg text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Index for fast driver payment lookups
CREATE INDEX IF NOT EXISTS idx_driver_payments_driver_id ON driver_payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_reg ON expenses(vehicle_reg);
