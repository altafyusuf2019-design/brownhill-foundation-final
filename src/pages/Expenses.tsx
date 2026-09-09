import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Expense, Vehicle } from '../lib/supabase';
import { todayISO, getCurrentReportingWeek } from '../lib/dateUtils';
import ReceiptScanner from '../components/ReceiptScanner';
import type { ScanResult } from '../components/ReceiptScanner';

interface Props {
  partnerView: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

/** Calculates VAT breakdown from a gross (VAT-inclusive) amount at 20% */
function calcVat(grossStr: string): { gross: number; vat: number; net: number } | null {
  const gross = parseFloat(grossStr);
  if (!grossStr || isNaN(gross) || gross <= 0) return null;
  const net = gross / 1.2;
  const vat = gross - net;
  return { gross, vat: parseFloat(vat.toFixed(2)), net: parseFloat(net.toFixed(2)) };
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Expenses({ partnerView }: Props) {
  const week = getCurrentReportingWeek();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [regSearch, setRegSearch] = useState('');
  const [showRegDropdown, setShowRegDropdown] = useState(false);

  // OCR state: when non-null, shows a confirmation banner above the form
  const [pendingScan, setPendingScan] = useState<ScanResult | null>(null);

  const [form, setForm] = useState({
    receipt_name: '',
    gross_amount: '',
    expense_date: todayISO(),
    vehicle_reg: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dynamic Google Sheets Categories State
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Fetch categories from Google Sheets API
  useEffect(() => {
    // ⚠️ REPLACE THIS URL WITH YOUR ACTUAL GOOGLE SCRIPT URL ⚠️
    // Make sure it ends with ?action=getCategories
    fetch('https://script.google.com/macros/s/AKfycbwqjy9KFz8WnWJ0pXYRXszqZ1YYJUjDFZNKeV0MHJHLg0C2e2fVc6RMS6i1iSJUIh4APg/exec')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        setLoadingCats(false);
      })
      .catch(err => {
        console.error("Error fetching categories:", err);
        setLoadingCats(false);
      });
  }, []);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [expRes, vehRes] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('vehicles').select('*').order('registration'),
    ]);
    setExpenses(expRes.data || []);
    setVehicles(vehRes.data || []);
    setLoading(false);
  }

  const filteredRegs = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v =>
      v.registration.toLowerCase().includes(q) ||
      v.make_model.toLowerCase().includes(q)
    );
  }, [vehicles, regSearch]);

  /** Called by ReceiptScanner when OCR completes. Shows confirmation banner. */
  function handleScanResult(result: ScanResult) {
    setPendingScan(result);
  }

  /** User accepts the OCR result — pre-fills the form. */
  function acceptScan() {
    if (!pendingScan) return;
    setForm(f => ({
      ...f,
      gross_amount: pendingScan.gross || f.gross_amount,
      expense_date: pendingScan.date || f.expense_date,
    }));
    setPendingScan(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.receipt_name.trim() || !form.gross_amount) return;
    setSaving(true);

    const breakdown = calcVat(form.gross_amount);
    const gross = breakdown?.gross ?? parseFloat(form.gross_amount);
    const vat = breakdown?.vat ?? 0;
    const net = breakdown?.net ?? gross;

    const { data: inserted, error: insertErr } = await supabase.from('expenses').insert({
      receipt_name: form.receipt_name.trim(),
      total_cost: gross,
      gross_amount: gross,
      vat_amount: vat,
      net_amount: net,
      expense_date: form.expense_date,
      vehicle_reg: form.vehicle_reg,
    }).select().maybeSingle();

    setSaving(false);

    if (insertErr) {
      console.error('Expense insert failed:', insertErr);
      return;
    }

    if (inserted) {
      setExpenses(prev => [inserted as Expense, ...prev]);
    }

    setForm({ receipt_name: '', gross_amount: '', expense_date: todayISO(), vehicle_reg: '' });
    setRegSearch('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('Expense delete failed:', error); return; }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const vatBreakdown = calcVat(form.gross_amount);

  const visibleExpenses = useMemo(() => {
    if (showAll) return expenses;
    return expenses.filter(e => e.expense_date >= week.start && e.expense_date <= week.end);
  }, [expenses, showAll, week.start, week.end]);

  const totalCost = visibleExpenses.reduce((s, e) => s + Number(e.total_cost), 0);
  const totalVat = visibleExpenses.reduce((s, e) => s + Number(e.vat_amount), 0);

  return (
    <div>
      <header className="page-header">
        <h1>Expenses</h1>
        <p>{showAll ? 'All time' : `Week: ${week.label}`}</p>
      </header>

      <main className="page-content">
        {!partnerView && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, color: 'var(--neutral-800)' }}>
              New Expense
            </p>

            {/* OCR Confirmation Banner */}
            {pendingScan && (
              <div className="scan-confirm-banner">
                <div className="scan-confirm-label">Receipt scanned</div>
                <div className="scan-confirm-row">
                  {pendingScan.gross && (
                    <span className="scan-confirm-pill">
                      Gross: <strong>£{pendingScan.gross}</strong>
                    </span>
                  )}
                  {pendingScan.date && (
                    <span className="scan-confirm-pill">
                      Date: <strong>{new Date(pendingScan.date + 'T00:00:00').toLocaleDateString('en-GB')}</strong>
                    </span>
                  )}
                  {!pendingScan.gross && !pendingScan.date && (
                    <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>Nothing detected — enter manually</span>
                  )}
                </div>
                <div className="scan-confirm-actions">
                  <button type="button" className="btn btn-success btn-sm" onClick={acceptScan}>
                    <CheckIcon /> Use These Values
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingScan(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Receipt Name</label>
                <select
                  className="form-input"
                  value={form.receipt_name}
                  onChange={e => setForm(f => ({ ...f, receipt_name: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    {loadingCats ? "Loading categories from Sheet..." : "Select an expense category..."}
                  </option>
                  
                  {categories.map((cat, index) => (
                    <option key={index} value={cat}>{cat}</option>
                  ))}
                  
                </select>
              </div>

              {/* Gross Total + Scan button on same row */}
              <div className="form-group">
                <label className="form-label">Gross Total (£ inc. VAT)</label>
                <div className="gross-input-row">
                  <input
                    className="form-input"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={form.gross_amount}
                    onChange={e => setForm(f => ({ ...f, gross_amount: e.target.value }))}
                    required
                  />
                  <ReceiptScanner onResult={handleScanResult} />
                </div>
              </div>

              {/* Auto-calculated VAT breakdown */}
              {vatBreakdown && (
                <div className="vat-breakdown">
                  <div className="vat-breakdown-row">
                    <span>VAT (20%)</span>
                    <span className="vat-breakdown-value">{fmt(vatBreakdown.vat)}</span>
                  </div>
                  <div className="vat-breakdown-row">
                    <span>Net (ex. VAT)</span>
                    <span className="vat-breakdown-value">{fmt(vatBreakdown.net)}</span>
                  </div>
                </div>
              )}

              {/* Vehicle Reg searchable dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Vehicle Reg (optional)</label>
                <input
                  className="form-input"
                  placeholder="Search reg or type to filter..."
                  value={regSearch || form.vehicle_reg}
                  style={{ textTransform: 'uppercase' }}
                  onFocus={() => setShowRegDropdown(true)}
                  onChange={e => {
                    setRegSearch(e.target.value);
                    setForm(f => ({ ...f, vehicle_reg: '' }));
                    setShowRegDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowRegDropdown(false), 150)}
                  autoComplete="off"
                />
                {form.vehicle_reg && (
                  <button
                    type="button"
                    className="reg-clear-btn"
                    onMouseDown={e => { e.preventDefault(); setForm(f => ({ ...f, vehicle_reg: '' })); setRegSearch(''); }}
                  >
                    ✕
                  </button>
                )}
                {showRegDropdown && (
                  <div className="reg-dropdown">
                    {vehicles.length === 0 && (
                      <div className="reg-dropdown-empty">No vehicles added yet</div>
                    )}
                    {filteredRegs.length === 0 && vehicles.length > 0 && (
                      <div className="reg-dropdown-empty">No matches</div>
                    )}
                    {filteredRegs.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className={`reg-dropdown-item ${form.vehicle_reg === v.registration ? 'selected' : ''}`}
                        onMouseDown={() => {
                          setForm(f => ({ ...f, vehicle_reg: v.registration }));
                          setRegSearch('');
                          setShowRegDropdown(false);
                        }}
                      >
                        <span className="reg-badge-sm">{v.registration}</span>
                        {v.make_model && <span className="reg-make">{v.make_model}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className={`btn btn-full ${success ? 'btn-success' : 'btn-primary'}`}
                disabled={saving}
                style={{ marginTop: 4 }}
              >
                {success ? 'Saved!' : saving ? 'Saving...' : 'Add Expense'}
              </button>
            </form>
          </div>
        )}

        {visibleExpenses.length > 0 && (
          <div className="summary-grid" style={{ marginBottom: 12 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">Total Spent</div>
              <div className="card-value red" style={{ fontSize: '1.4rem' }}>{fmt(totalCost)}</div>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-title">VAT Paid</div>
              <div className="card-value blue" style={{ fontSize: '1.4rem' }}>{fmt(totalVat)}</div>
            </div>
          </div>
        )}

        <div className="row-header" style={{ marginBottom: 10 }}>
          <p className="section-title">Expense Log</p>
          <button
            className={`btn btn-sm ${showAll ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowAll(v => !v)}
          >
            {showAll ? 'This Week' : 'All Time'}
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : visibleExpenses.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
            </svg>
            <p>{showAll ? 'No expenses logged yet.' : 'No expenses this week.'}</p>
          </div>
        ) : (
          visibleExpenses.map(expense => (
            <div key={expense.id} className="list-item">
              <div className="list-item-left">
                <div className="list-item-name">{expense.receipt_name}</div>
                <div className="list-item-sub">
                  {new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB')}
                  {expense.vehicle_reg && (
                    <span className="reg-badge-inline">{expense.vehicle_reg}</span>
                  )}
                  {expense.vat_amount > 0 && (
                    <span style={{ marginLeft: 6, color: 'var(--navy-600)', fontWeight: 600 }}>
                      VAT: {fmt(expense.vat_amount)}
                    </span>
                  )}
                </div>
              </div>
              <div className="list-item-right">
                <span className="amount-badge" style={{ color: 'var(--danger)' }}>
                  {fmt(expense.total_cost)}
                </span>
                {!partnerView && (
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '4px' }}
                    onClick={() => handleDelete(expense.id)}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
