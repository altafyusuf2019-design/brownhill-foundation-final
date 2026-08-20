import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Driver, ExtraShift, Expense, Income } from '../lib/supabase';
import {
  getReportingPeriodForMonth,
  getAvailableReportingMonths,
  formatDateGB,
} from '../lib/dateUtils';

interface Props {
  partnerView: boolean;
  onTogglePartnerView: () => void;
}

type IncomeRow = Income & { includes_vat: boolean };
type DriverWithShifts = Driver & { shifts: ExtraShift[] };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const vatFromInclusive = (amount: number) => amount * (20 / 120);

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const now = new Date();
const DEFAULT_YEAR = now.getFullYear();
const DEFAULT_MONTH = now.getMonth() + 1;

export default function PartnerReport({ partnerView, onTogglePartnerView }: Props) {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH);
  const [availableMonths, setAvailableMonths] = useState<
    Array<{ year: number; month: number; label: string }>
  >([]);

  const [drivers, setDrivers] = useState<DriverWithShifts[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available months once — determined by the earliest income or expense date
  useEffect(() => {
    async function fetchEarliest() {
      const [incRes, expRes] = await Promise.all([
        supabase.from('income').select('income_date').order('income_date').limit(1),
        supabase.from('expenses').select('expense_date').order('expense_date').limit(1),
      ]);
      const dates: string[] = [];
      if (incRes.data?.[0]?.income_date) dates.push(incRes.data[0].income_date);
      if (expRes.data?.[0]?.expense_date) dates.push(expRes.data[0].expense_date);
      const earliest = dates.length ? dates.sort()[0] : new Date().toISOString().slice(0, 7) + '-01';
      setAvailableMonths(getAvailableReportingMonths(earliest));
    }
    fetchEarliest();
  }, []);

  const period = getReportingPeriodForMonth(selectedYear, selectedMonth);

  useEffect(() => { loadData(); }, [selectedYear, selectedMonth]);

  async function loadData() {
    setLoading(true);
    const { start, end } = getReportingPeriodForMonth(selectedYear, selectedMonth);

    const [driversRes, shiftsRes, expensesRes, incomeRes] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase
        .from('extra_shifts')
        .select('*')
        .gte('shift_date', start)
        .lte('shift_date', end),
      supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false }),
      supabase
        .from('income')
        .select('*')
        .gte('income_date', start)
        .lte('income_date', end)
        .order('income_date', { ascending: false }),
    ]);

    const driversData = driversRes.data || [];
    const shiftsData = shiftsRes.data || [];
    setDrivers(driversData.map(d => ({
      ...d,
      shifts: shiftsData.filter(s => s.driver_id === d.id),
    })));
    setExpenses(expensesRes.data || []);
    setIncome((incomeRes.data || []) as IncomeRow[]);
    setLoading(false);
  }

  const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
  const vatCollected = income.reduce((s, i) => s + (i.includes_vat ? vatFromInclusive(Number(i.amount)) : 0), 0);
  const totalWages = drivers.reduce((s, d) => s + Number(d.weekly_wage), 0);
  const totalExtraShifts = drivers.reduce((s, d) => s + d.shifts.reduce((ss, sh) => ss + Number(sh.amount), 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.total_cost), 0);
  const totalVatPaid = expenses.reduce((s, e) => s + Number(e.vat_amount), 0);
  const netVatToPay = vatCollected - totalVatPaid;
  const totalOut = totalWages + totalExtraShifts + totalExpenses;
  const profit = (totalIncome - vatCollected) - (totalExpenses - totalVatPaid) - (totalWages + totalExtraShifts);

  function handleWhatsAppShare() {
    const lines = [
      `*BROWNHILL PRIVATE HIRE — Business Report*`,
      `_Period: ${formatDateGB(period.start)} – ${formatDateGB(period.end)}_`,
      ``,
      `*FINANCIALS*`,
      `Money In: ${fmt(totalIncome)}`,
      `Money Out: ${fmt(totalOut)}`,
      `Net Profit (ex. VAT): *${fmt(profit)}*`,
      ``,
      `*VAT SUMMARY*`,
      `VAT Collected: ${fmt(vatCollected)}`,
      `VAT Paid: ${fmt(totalVatPaid)}`,
      `${netVatToPay >= 0 ? 'Net VAT to Pay' : 'VAT to Claim'}: *${fmt(Math.abs(netVatToPay))}*`,
      ``,
      `*WAGES*`,
      `Weekly Wages: ${fmt(totalWages)}`,
      `Extra Shifts: ${fmt(totalExtraShifts)}`,
      `Total: *${fmt(totalWages + totalExtraShifts)}*`,
      ``,
      `*EXPENSES*`,
      `Total: ${fmt(totalExpenses)} (VAT: ${fmt(totalVatPaid)})`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }

  return (
    <div>
      <header className="page-header">
        <h1>Partner Report</h1>
        <p>{formatDateGB(period.start)} – {formatDateGB(period.end)}</p>
      </header>

      <main className="page-content">
        {/* Partner View Toggle */}
        <div className="partner-banner">
          <div>
            <div className="partner-banner-text">Partner View</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: 1 }}>
              {partnerView ? 'Read-only — editing disabled' : 'Toggle to hide edit controls'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {partnerView && <span className="partner-badge">Active</span>}
            <label className="toggle">
              <input type="checkbox" checked={partnerView} onChange={onTogglePartnerView} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Month Picker */}
        <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
          <label className="form-label" style={{ marginBottom: 6 }}>Reporting Period</label>
          <select
            className="form-input"
            value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          >
            {availableMonths.map(opt => (
              <option
                key={`${opt.year}-${opt.month}`}
                value={`${opt.year}-${String(opt.month).padStart(2, '0')}`}
              >
                {opt.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', marginTop: 6 }}>
            Showing: {formatDateGB(period.start)} – {formatDateGB(period.end)}
          </p>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Summary Overview */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="report-card-title">Overview</div>
              <table className="report-table">
                <tbody>
                  <tr>
                    <td>Total Income</td>
                    <td className="td-right" style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(totalIncome)}</td>
                  </tr>
                  <tr>
                    <td>Total Wages</td>
                    <td className="td-right">{fmt(totalWages)}</td>
                  </tr>
                  <tr>
                    <td>Extra Shifts</td>
                    <td className="td-right">{fmt(totalExtraShifts)}</td>
                  </tr>
                  <tr>
                    <td>Total Expenses</td>
                    <td className="td-right">{fmt(totalExpenses)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neutral-600)' }}>Total Money Out</td>
                    <td className="td-right" style={{ color: 'var(--danger)' }}>{fmt(totalOut)}</td>
                  </tr>
                  <tr className="total-row">
                    <td>Net Profit (ex. VAT)</td>
                    <td className="td-right" style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {fmt(profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* VAT Summary */}
            <div className="card vat-card" style={{ marginBottom: 12 }}>
              <div className="vat-title">VAT Summary</div>
              <div className="vat-row">
                <span className="vat-label">VAT Collected (on income)</span>
                <span className="vat-amount">{fmt(vatCollected)}</span>
              </div>
              <div className="vat-row">
                <span className="vat-label">VAT Paid (on expenses)</span>
                <span className="vat-amount">{fmt(totalVatPaid)}</span>
              </div>
              <div className="vat-row vat-net">
                <span className="vat-label">{netVatToPay >= 0 ? 'Net VAT to Pay HMRC' : 'VAT to Claim Back'}</span>
                <span className="vat-amount">{fmt(Math.abs(netVatToPay))}</span>
              </div>
            </div>

            {/* Income Breakdown */}
            {income.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="report-card-title">Income Breakdown</div>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map(item => (
                      <tr key={item.id}>
                        <td>
                          {item.description}
                          {item.includes_vat && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--brand-red)', fontWeight: 700, marginLeft: 5 }}>
                              INC.VAT
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--neutral-500)', whiteSpace: 'nowrap' }}>
                          {new Date(item.income_date + 'T00:00:00').toLocaleDateString('en-GB')}
                        </td>
                        <td className="td-right" style={{ color: 'var(--success)' }}>{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2}>Total Income</td>
                      <td className="td-right">{fmt(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Driver Wages */}
            {drivers.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="report-card-title">Driver Wages</div>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th style={{ textAlign: 'right' }}>Weekly</th>
                      <th style={{ textAlign: 'right' }}>Extra</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map(driver => {
                      const extraTotal = driver.shifts.reduce((s, sh) => s + Number(sh.amount), 0);
                      return (
                        <tr key={driver.id}>
                          <td>{driver.name}</td>
                          <td className="td-right">{fmt(driver.weekly_wage)}</td>
                          <td className="td-right" style={{ color: extraTotal > 0 ? 'var(--success)' : 'var(--neutral-400)' }}>
                            {extraTotal > 0 ? fmt(extraTotal) : '—'}
                          </td>
                          <td className="td-right" style={{ fontWeight: 700 }}>
                            {fmt(Number(driver.weekly_wage) + extraTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td colSpan={2}>Total Wages</td>
                      <td className="td-right">{fmt(totalExtraShifts)}</td>
                      <td className="td-right">{fmt(totalWages + totalExtraShifts)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Expenses Breakdown */}
            {expenses.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="report-card-title">Expenses Breakdown</div>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Receipt</th>
                      <th style={{ textAlign: 'right' }}>VAT</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(expense => (
                      <tr key={expense.id}>
                        <td>
                          <div>{expense.receipt_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>
                            {new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB')}
                          </div>
                        </td>
                        <td className="td-right" style={{ color: 'var(--neutral-500)' }}>
                          {expense.vat_amount > 0 ? fmt(expense.vat_amount) : '—'}
                        </td>
                        <td className="td-right">{fmt(expense.total_cost)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td>Total Expenses</td>
                      <td className="td-right">{fmt(totalVatPaid)}</td>
                      <td className="td-right">{fmt(totalExpenses)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {income.length === 0 && drivers.length === 0 && expenses.length === 0 && (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h5" />
                </svg>
                <p>No data for this period.<br />Try selecting a different month.</p>
              </div>
            )}
          </>
        )}

        {/* WhatsApp Share */}
        <button
          className="btn btn-whatsapp btn-full"
          style={{ marginTop: 8, marginBottom: 4, fontSize: '0.95rem', padding: '13px 16px' }}
          onClick={handleWhatsAppShare}
        >
          <WhatsAppIcon />
          Share to WhatsApp
        </button>
      </main>
    </div>
  );
}
