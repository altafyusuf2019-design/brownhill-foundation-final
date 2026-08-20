import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Driver = {
  id: string;
  name: string;
  weekly_wage: number;
  created_at: string;
};

export type ExtraShift = {
  id: string;
  driver_id: string;
  amount: number;
  shift_date: string;
  note: string;
  created_at: string;
};

export type Expense = {
  id: string;
  receipt_name: string;
  total_cost: number;
  gross_amount: number | null;
  vat_amount: number;
  net_amount: number | null;
  expense_date: string;
  vehicle_reg: string;
  created_at: string;
};

export type Income = {
  id: string;
  description: string;
  amount: number;
  gross_amount: number | null;
  net_amount: number | null;
  income_date: string;
  created_at: string;
};

export type Vehicle = {
  id: string;
  registration: string;
  make_model: string;
  created_at: string;
};

export type DriverPayment = {
  id: string;
  driver_id: string;
  amount: number;
  payment_date: string;
  note: string;
  created_at: string;
};
