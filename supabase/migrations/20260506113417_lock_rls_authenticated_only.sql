/*
  # Lock All Tables to Authenticated Users Only

  ## Summary
  Removes all `anon` role policies from every table and replaces them with
  `authenticated`-only policies. After this migration, unauthenticated
  visitors cannot read, write, or delete any data. Only a signed-in admin
  can access the application data.

  ## Tables Modified
  - `drivers` — remove anon policies, keep authenticated
  - `extra_shifts` — remove anon policies, keep authenticated
  - `expenses` — remove anon policies, keep authenticated
  - `income` — remove anon policies, keep authenticated
  - `vehicles` — remove anon policies, keep authenticated
  - `driver_payments` — remove anon policies, keep authenticated

  ## Security Changes
  - All `anon` role policies dropped on all tables
  - Authenticated policies remain with USING (true) / WITH CHECK (true)
    because this is a single-admin tool — row ownership is not required,
    just a valid authenticated session.

  ## Notes
  1. Existing authenticated policies are dropped and recreated cleanly.
  2. No data is modified — schema and row data are untouched.
  3. After this migration, Supabase Auth must be used to access the app.
*/

-- ── drivers ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow anon insert on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow anon update on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow anon delete on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated select on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated insert on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated update on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow authenticated delete on drivers" ON drivers;

CREATE POLICY "Admin can select drivers"
  ON drivers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert drivers"
  ON drivers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update drivers"
  ON drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete drivers"
  ON drivers FOR DELETE TO authenticated USING (true);

-- ── extra_shifts ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow anon insert on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow anon update on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow anon delete on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow authenticated select on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow authenticated insert on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow authenticated update on extra_shifts" ON extra_shifts;
DROP POLICY IF EXISTS "Allow authenticated delete on extra_shifts" ON extra_shifts;

CREATE POLICY "Admin can select extra_shifts"
  ON extra_shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert extra_shifts"
  ON extra_shifts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update extra_shifts"
  ON extra_shifts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete extra_shifts"
  ON extra_shifts FOR DELETE TO authenticated USING (true);

-- ── expenses ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon insert on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon update on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon delete on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated select on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated insert on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated update on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated delete on expenses" ON expenses;

CREATE POLICY "Admin can select expenses"
  ON expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert expenses"
  ON expenses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update expenses"
  ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete expenses"
  ON expenses FOR DELETE TO authenticated USING (true);

-- ── income ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on income" ON income;
DROP POLICY IF EXISTS "Allow anon insert on income" ON income;
DROP POLICY IF EXISTS "Allow anon update on income" ON income;
DROP POLICY IF EXISTS "Allow anon delete on income" ON income;
DROP POLICY IF EXISTS "Allow authenticated select on income" ON income;
DROP POLICY IF EXISTS "Allow authenticated insert on income" ON income;
DROP POLICY IF EXISTS "Allow authenticated update on income" ON income;
DROP POLICY IF EXISTS "Allow authenticated delete on income" ON income;

CREATE POLICY "Admin can select income"
  ON income FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert income"
  ON income FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update income"
  ON income FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete income"
  ON income FOR DELETE TO authenticated USING (true);

-- ── vehicles ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow anon insert on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow anon update on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow anon delete on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated select on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated insert on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated update on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow authenticated delete on vehicles" ON vehicles;

CREATE POLICY "Admin can select vehicles"
  ON vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert vehicles"
  ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update vehicles"
  ON vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete vehicles"
  ON vehicles FOR DELETE TO authenticated USING (true);

-- ── driver_payments ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow anon select on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow anon insert on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow anon update on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow anon delete on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow authenticated select on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow authenticated insert on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow authenticated update on driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "Allow authenticated delete on driver_payments" ON driver_payments;

CREATE POLICY "Admin can select driver_payments"
  ON driver_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert driver_payments"
  ON driver_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin can update driver_payments"
  ON driver_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete driver_payments"
  ON driver_payments FOR DELETE TO authenticated USING (true);
