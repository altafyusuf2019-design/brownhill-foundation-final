import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Income } from '../lib/supabase';
import { todayISO, getCurrentReportingWeek } from '../lib/dateUtils';

interface Props {
  partnerView: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const vatFromInclusive = (amount: number) => amount * (20 / 120);

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

type IncomeRow = Income & { includes_vat: boolean };

export default function Home({ partnerView }: Props) {
  const week = getCurrentReportingWeek();

  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [wages, setWages] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalVatPaid, setTotalVatPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    includes_vat: false,
    income_date: todayISO(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [incomeRes, driversRes, shiftsRes, expensesRes] = await Promise.all([
      supabase
        .from('income')
        .select('*')
        .gte('income_date', week.start)
        .lte('income_date', week.end)
        .order('income_date', { ascending: false }),
      supabase.from('drivers').select('weekly_wage'),
      supabase
        .from('extra_shifts')
        .select('amount')
        .gte('shift_date', week.start)
        .lte('shift_date', week.end),
      supabase
        .from('expenses')
        .select('total_cost, vat_amount')
        .gte('expense_date', week.start)
        .lte('expense_date', week.end),
    ]);

    if (incomeRes.data) setIncome(incomeRes.data as IncomeRow[]);

    // Weekly wages: sum of all drivers' weekly_wage (fixed weekly cost)
    const totalWages = (driversRes.data || []).reduce((s, d) => s + Number(d.weekly_wage), 0);
    // Extra shifts only within this week
    const totalShifts = (shiftsRes.data || []).reduce((s, d) => s + Number(d.amount), 0);
    setWages(totalWages + totalShifts);

    const expData = expensesRes.data || [];
    setTotalExpenses(expData.reduce((s, e) => s + Number(e.total_cost), 0));
    setTotalVatPaid(expData.reduce((s, e) => s + Number(e.vat_amount), 0));
    setLoading(false);
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    const gross = parseFloat(form.amount) || 0;
    const net = form.includes_vat ? gross / 1.2 : gross;
    const vat = form.includes_vat ? gross - net : 0;
    await supabase.from('income').insert([{
      description: form.description.trim(),
      amount: gross,
      includes_vat: form.includes_vat,
      income_date: form.income_date,
      gross_amount: gross,
    }]);
    // net and vat are derived display values; not stored columns on income
    void vat; void net;
    setForm({ description: '', amount: '', includes_vat: false, income_date: todayISO() });
    setShowSheet(false);
    setSaving(false);
    loadData();
  }

  async function handleDelete(id: string) {
    await supabase.from('income').delete().eq('id', id);
    loadData();
  }

  const totalIn = income.reduce((s, i) => s + Number(i.amount), 0);
  const vatCollected = income.reduce((s, i) => s + (i.includes_vat ? vatFromInclusive(Number(i.amount)) : 0), 0);
  const netVatToPay = vatCollected - totalVatPaid;
  const moneyOut = wages + totalExpenses;
  const profit = (totalIn - vatCollected) - (totalExpenses - totalVatPaid) - wages;

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Week: {week.label}</p>
      </header>

      <main className="page-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Money In / Out / Profit */}
            <div className="summary-grid">
              <div className="card">
                <div className="card-title">Money In</div>
                <div className="card-value green">{fmt(totalIn)}</div>
              </div>
              <div className="card">
                <div className="card-title">Money Out</div>
                <div className="card-value red">{fmt(moneyOut)}</div>
              </div>
              <div className="card summary-card-full">
                <div className="card-title">Profit (ex. VAT)</div>
                <div className={`card-value ${profit >= 0 ? 'blue' : 'red'}`}>{fmt(profit)}</div>
              </div>
            </div>

            {/* VAT Summary */}
            <div className="card vat-card">
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
                <span className="vat-label">{netVatToPay >= 0 ? 'Net VAT to Pay' : 'VAT to Claim Back'}</span>
                <span className="vat-amount">{fmt(Math.abs(netVatToPay))}</span>
              </div>
            </div>

            {/* Income List */}
            <div className="row-header">
              <p className="section-title">Income This Week</p>
              {!partnerView && (
                <button className="btn btn-brand btn-sm" onClick={() => setShowSheet(true)}>
                  <PlusIcon /> Add Income
                </button>
              )}
            </div>

            {income.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
                <p>No income this week.<br />Tap Add Income to get started.</p>
              </div>
            ) : (
              income.map(item => (
                <div key={item.id} className="list-item">
                  <div className="list-item-left">
                    <div className="list-item-name">{item.description}</div>
                    <div className="list-item-sub">
                      {new Date(item.income_date + 'T00:00:00').toLocaleDateString('en-GB')}
                      {item.includes_vat && (
                        <span style={{ marginLeft: 8, color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.72rem' }}>
                          INC. VAT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="list-item-right">
                    <span className="amount-badge" style={{ color: 'var(--success)' }}>{fmt(item.amount)}</span>
                    {!partnerView && (
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '4px' }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </main>

      {/* Add Income Sheet */}
      {showSheet && (
        <div className="overlay" onClick={() => setShowSheet(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Add Income</p>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="e.g. School Route A — April"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (£)</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.income_date}
                  onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))}
                />
              </div>
            </div>
            <div
              className="checkbox-row"
              onClick={() => setForm(f => ({ ...f, includes_vat: !f.includes_vat }))}
            >
              <input
                type="checkbox"
                checked={form.includes_vat}
                onChange={() => {}}
                id="vat-check"
              />
              <label htmlFor="vat-check">Includes 20% VAT</label>
            </div>
            {form.includes_vat && form.amount && parseFloat(form.amount) > 0 && (
              <div className="vat-breakdown">
                <div className="vat-breakdown-row">
                  <span>VAT (20%)</span>
                  <span className="vat-breakdown-value">
                    {fmt(vatFromInclusive(parseFloat(form.amount) || 0))}
                  </span>
                </div>
                <div className="vat-breakdown-row">
                  <span>Net (ex. VAT)</span>
                  <span className="vat-breakdown-value">
                    {fmt((parseFloat(form.amount) || 0) - vatFromInclusive(parseFloat(form.amount) || 0))}
                  </span>
                </div>
              </div>
            )}
            <div className="sheet-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
