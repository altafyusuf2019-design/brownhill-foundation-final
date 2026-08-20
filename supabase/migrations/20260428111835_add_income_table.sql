/*
  # Add Income Table

  1. New Tables
    - `income`
      - `id` (uuid, primary key)
      - `description` (text) - source/description of income
      - `amount` (numeric) - income amount in GBP
      - `income_date` (date) - date of the income
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on income table
    - Allow anon and authenticated full access (internal business tool)
*/

CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  income_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to income"
  ON income FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert income"
  ON income FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update income"
  ON income FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete income"
  ON income FOR DELETE TO anon, authenticated USING (true);
