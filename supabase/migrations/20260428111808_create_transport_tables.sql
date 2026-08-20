/*
  # School Transport Business App - Initial Schema

  1. New Tables
    - `drivers`
      - `id` (uuid, primary key)
      - `name` (text) - driver's full name
      - `weekly_wage` (numeric) - regular weekly wage in GBP
      - `created_at` (timestamp)
    - `extra_shifts`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, FK to drivers) - which driver did the shift
      - `amount` (numeric) - pay amount for the extra shift
      - `shift_date` (date) - date of the shift
      - `note` (text) - optional note about the shift
      - `created_at` (timestamp)
    - `expenses`
      - `id` (uuid, primary key)
      - `receipt_name` (text) - name/description from receipt
      - `total_cost` (numeric) - total cost on the receipt
      - `vat_amount` (numeric) - VAT amount on the receipt
      - `expense_date` (date) - date of the expense
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users full access to all tables
    - Allow anon users read/write (this is an internal business tool without user auth)

  Note: This is a simple internal business tool. RLS is enabled but policies
  allow authenticated and anon access since there's no user login system.
*/

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  weekly_wage numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extra_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_name text NOT NULL DEFAULT '',
  total_cost numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated full access (internal business tool, no user login)
CREATE POLICY "Allow full access to drivers"
  ON drivers FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert drivers"
  ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update drivers"
  ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete drivers"
  ON drivers FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow full access to extra_shifts"
  ON extra_shifts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert extra_shifts"
  ON extra_shifts FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update extra_shifts"
  ON extra_shifts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete extra_shifts"
  ON extra_shifts FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow full access to expenses"
  ON expenses FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert expenses"
  ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update expenses"
  ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete expenses"
  ON expenses FOR DELETE TO anon, authenticated USING (true);
