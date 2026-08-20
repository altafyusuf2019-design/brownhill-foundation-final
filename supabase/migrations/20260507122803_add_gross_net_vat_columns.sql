/*
  # Add gross_amount and net_amount to expenses and income

  ## Summary
  Adds structured VAT accounting columns to both tables so the system can
  store all three figures — gross (what the user enters), VAT (20%), and net
  (gross ÷ 1.2) — separately.

  ## Modified Tables

  ### `expenses`
  - `gross_amount` (numeric 10,2) — the VAT-inclusive total entered by the user
  - `net_amount`   (numeric 10,2) — gross ÷ 1.2, calculated at save time
  - `vat_amount` already exists; now always written as gross − net

  ### `income`
  - `gross_amount` (numeric 10,2) — the VAT-inclusive amount entered
  - `net_amount`   (numeric 10,2) — gross ÷ 1.2 when includes_vat is true,
                                    otherwise equals gross

  ## Notes
  1. Both columns are nullable so existing rows are not broken.
  2. `total_cost` on expenses is kept for backward compatibility; new writes
     also populate gross_amount so both are consistent.
  3. No data is modified — only schema is changed.
*/

-- ── expenses ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'gross_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN gross_amount numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN net_amount numeric(10,2);
  END IF;
END $$;

-- ── income ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'gross_amount'
  ) THEN
    ALTER TABLE income ADD COLUMN gross_amount numeric(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE income ADD COLUMN net_amount numeric(10,2);
  END IF;
END $$;
