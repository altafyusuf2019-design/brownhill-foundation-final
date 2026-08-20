/*
  # Add VAT tracking to income table

  1. Changes
    - `income` table: add `includes_vat` boolean column (default false)
      - When true, the income amount includes 20% VAT
      - VAT portion = amount * (20/120) = amount / 6

  2. Notes
    - Existing rows default to false (no VAT included)
    - Used to calculate VAT Collected on the dashboard
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'includes_vat'
  ) THEN
    ALTER TABLE income ADD COLUMN includes_vat boolean NOT NULL DEFAULT false;
  END IF;
END $$;
