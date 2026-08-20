import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Driver, ExtraShift, DriverPayment } from '../lib/supabase';

interface Props {
  partnerView: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

type LedgerDriver = Driver & {
  shifts: ExtraShift[];
  payments: DriverPayment[];
};

type SheetMode =
  | { type: 'logPayment'; driver: LedgerDriver }
  | { type: 'statement'; driver: LedgerDriver }
  | null;

const PAGE_SIZE = 15;

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

export default function DriverLedger({ partnerView }: Props) {
  const [drivers, setDrivers] = useState<LedgerDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [driversRes, shiftsRes, paymentsRes] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('extra_shifts').select('*'),
      supabase.from('driver_payments').select('*').order('payment_date', { ascending: false }),
    ]);
    const driversData = driversRes.data || [];
    const shiftsData = shiftsRes.data || [];
    const paymentsData = paymentsRes.data || [];
    setDrivers(driversData.map(d => ({
      ...d,
      shifts: shiftsData.filter(s => s.driver_id === d.id),
      payments: paymentsData.filter(p => p.driver_id === d.id),
    })));
    setLoading(false);
  }

  async function handleLogPayment() {
    if (!payForm.amount || !sheet || sheet.type !== 'logPayment') return;
    setSaving(true);
    await supabase.from('driver_payments').insert({
      driver_id: sheet.driver.id,
      amount: parseFloat(payForm.amount),
      payment_date: payForm.payment_date,
      note: payForm.note.trim(),
    });
    setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' });
    setSheet(null);
    setSaving(false);
    loadData();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d => d.name.toLowerCase().includes(q));
  }, [drivers, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = search.trim() ? filtered : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

 const totals = useMemo(() => {
    const totalEarned = drivers.reduce((s, d) => {
      const wage = Number(d.weekly_wage);
      // ADDED FILTER HERE
      const extra = d.shifts
        .filter(sh => new Date(sh.shift_date) >= new Date('2026-04-26'))
        .reduce((a, sh) => a + Number(sh.amount), 0);
      return s + wage + extra;
    }, 0);
    const totalPaid = drivers.reduce((s, d) =>
      // ADDED FILTER HERE
      s + d.payments
        .filter(p => new Date(p.payment_date) >= new Date('2026-04-26'))
        .reduce((a, p) => a + Number(p.amount), 0), 0);
    return { totalEarned, totalPaid, totalBalance: totalEarned - totalPaid };
  }, [drivers]);

  function calcDriver(d: LedgerDriver) {
    // ADDED FILTER TO SHIFTS
    const earned = Number(d.weekly_wage) + d.shifts
      .filter(sh => new Date(sh.shift_date) >= new Date('2026-04-26'))
      .reduce((a, sh) => a + Number(sh.amount), 0);
      
    // ADDED FILTER TO PAYMENTS
    const paid = d.payments
      .filter(p => new Date(p.payment_date) >= new Date('2026-04-26'))
      .reduce((a, p) => a + Number(p.amount), 0);
      
    return { earned, paid, balance: earned - paid };
  }

  return (
    <div>
      <header className="page-header">
        <h1>Pay Hub</h1>
        <p>Driver ledger &amp; payment tracking</p>
      </header>

      <main className="page-content">
        {/* Fleet totals */}
        <div className="summary-grid" style={{ marginBottom: 14 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Total Earned</div>
            <div className="card-value blue" style={{ fontSize: '1.3rem' }}>{fmt(totals.totalEarned)}</div>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Total Paid</div>
            <div className="card-value green" style={{ fontSize: '1.3rem' }}>{fmt(totals.totalPaid)}</div>
          </div>
          <div className="card summary-card-full" style={{ marginBottom: 0 }}>
            <div className="card-title">{totals.totalBalance < 0 ? 'Overpaid' : 'Outstanding Balance'}</div>
            <div className={`card-value ${totals.totalBalance > 0 ? 'red' : totals.totalBalance < 0 ? 'orange' : 'green'}`} style={{ fontSize: '1.5rem' }}>
              {fmt(Math.abs(totals.totalBalance))}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="search-bar-wrap">
          <span className="search-icon"><SearchIcon /></span>
          <input
            className="search-bar"
            placeholder="Search drivers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="row-header" style={{ marginTop: 14 }}>
          <p className="section-title">
            {filtered.length} Driver{filtered.length !== 1 ? 's' : ''}
            {search && ' found'}
          </p>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No drivers match "{search}"</p>
          </div>
        ) : (
          <>
            {paginated.map(driver => {
              const { earned, paid, balance } = calcDriver(driver);
              return (
                <div key={driver.id} className="ledger-card">
                  <div className="ledger-card-top">
                    <div className="ledger-name">{driver.name}</div>
                    <div className={`ledger-balance ${balance > 0 ? 'owed' : balance < 0 ? 'overpaid' : 'clear'}`}>
                      {balance > 0 ? `Owed ${fmt(balance)}` : balance < 0 ? 'Overpaid' : 'Settled'}
                    </div>
                  </div>
                  <div className="ledger-stats">
                    <div className="ledger-stat">
                      <span className="ledger-stat-label">Earned</span>
                      <span className="ledger-stat-value">{fmt(earned)}</span>
                    </div>
                    <div className="ledger-stat-divider" />
                    <div className="ledger-stat">
                      <span className="ledger-stat-label">Paid</span>
                      <span className="ledger-stat-value green">{fmt(paid)}</span>
                    </div>
                    <div className="ledger-stat-divider" />
                    <div className="ledger-stat">
                      <span className="ledger-stat-label">{balance < 0 ? 'Overpaid' : 'Balance'}</span>
                      <span className={`ledger-stat-value ${balance > 0 ? 'red' : balance < 0 ? 'orange' : 'green'}`}>
                        {fmt(Math.abs(balance))}
                      </span>
                    </div>
                  </div>
                  <div className="ledger-actions">
                    {!partnerView && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => {
                          setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' });
                          setSheet({ type: 'logPayment', driver });
                        }}
                      >
                        <PlusIcon /> Log Payment
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSheet({ type: 'statement', driver })}
                    >
                      Statement <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination — only shown when not searching */}
            {!search.trim() && totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span className="pagination-info">
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Log Payment Sheet */}
      {sheet?.type === 'logPayment' && (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Log Payment — {sheet.driver.name}</p>
            <div className="ledger-sheet-balance">
              Balance owed: <strong>{fmt(calcDriver(sheet.driver).balance)}</strong>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount Paid (£)</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={payForm.payment_date}
                  onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Cash payment"
                value={payForm.note}
                onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleLogPayment} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement Sheet */}
      {sheet?.type === 'statement' && (() => {
        const driver = sheet.driver;
        const { earned, paid, balance } = calcDriver(driver);
        type StatEntry = { id: string | null; date: string; label: string; type: 'wage' | 'shift' | 'payment'; amount: number };
        const entries: StatEntry[] = [
          { id: null, date: (driver.created_at ?? new Date().toISOString()).slice(0, 10), label: 'Weekly Wage (standing)', type: 'wage' as const, amount: Number(driver.weekly_wage) },
          ...(driver.shifts ?? [])
            .filter(s => new Date(s.shift_date) >= new Date('2026-04-26'))
            .map(s => ({ id: s.id, date: s.shift_date, label: s.note || 'Extra Shift', type: 'shift' as const, amount: Number(s.amount) })),
          ...(driver.payments ?? [])
            .filter(p => new Date(p.payment_date) >= new Date('2026-04-26'))
            .map(p => ({ id: p.id, date: p.payment_date, label: p.note || 'Payment Made', type: 'payment' as const, amount: Number(p.amount) })),
        ].sort((a, b) => b.date.localeCompare(a.date));

        async function handleDeleteEntry(entry: StatEntry) {
          if (!entry.id) return;
          const table = entry.type === 'shift' ? 'extra_shifts' : 'driver_payments';
          const { error } = await supabase.from(table).delete().eq('id', entry.id);
          if (error) return;
          setDrivers(prev => prev.map(d => {
            if (d.id !== driver.id) return d;
            if (entry.type === 'shift') return { ...d, shifts: d.shifts.filter(s => s.id !== entry.id) };
            return { ...d, payments: d.payments.filter(p => p.id !== entry.id) };
          }));
          setSheet(s => s?.type === 'statement' ? {
            ...s,
            driver: {
              ...driver,
              shifts: entry.type === 'shift' ? (driver.shifts ?? []).filter(s => s.id !== entry.id) : (driver.shifts ?? []),
              payments: entry.type === 'payment' ? (driver.payments ?? []).filter(p => p.id !== entry.id) : (driver.payments ?? []),
            },
          } : s);
        }

        return (
          <div className="overlay" onClick={() => setSheet(null)}>
            <div className="sheet sheet-tall" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <p className="sheet-title">{driver.name} — Statement</p>
              <div className="statement-summary">
                <div className="statement-stat">
                  <span>Earned</span><strong>{fmt(earned)}</strong>
                </div>
                <div className="statement-stat">
                  <span>Paid</span><strong className="green">{fmt(paid)}</strong>
                </div>
                <div className="statement-stat">
                  <span>{balance < 0 ? 'Overpaid' : 'Balance'}</span>
                  <strong className={balance > 0 ? 'red' : balance < 0 ? 'orange' : 'green'}>
                    {fmt(Math.abs(balance))}
                  </strong>
                </div>
              </div>
              <div className="statement-list">
                {entries.length === 0 ? (
                  <div className="statement-empty">No transactions yet.</div>
                ) : entries.map((e, i) => (
                  <div key={i} className={`statement-row ${e.type}`}>
                    <div className="statement-row-left">
                      <span className="statement-row-label">{e.label}</span>
                      <span className="statement-row-date">{new Date(e.date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`statement-row-amount ${e.type === 'payment' ? 'green' : ''}`}>
                        {e.type === 'payment' ? '−' : '+'}{fmt(e.amount)}
                      </span>
                      {e.id && (
                        <button
                          className="statement-delete-btn"
                          onClick={() => handleDeleteEntry(e)}
                          aria-label="Delete transaction"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="sheet-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setSheet(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
