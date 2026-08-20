/*
  # Fix expenses.id missing default

  ## Problem
  The `id` column on the `expenses` table is `text NOT NULL` with no default value.
  Every INSERT that omits `id` is rejected by Postgres with a NOT NULL violation,
  causing all new expense submissions to silently fail.

  ## Changes
  - Alter `expenses.id` to add `DEFAULT gen_random_uuid()::text` so new rows
    receive a unique UUID-based text id automatically.
  - No data is modified; existing rows are unaffected.
*/

ALTER TABLE expenses
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
