import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Driver, ExtraShift } from '../lib/supabase';

interface Props {
  partnerView: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

type DriverWithShifts = Driver & { shifts: ExtraShift[] };

type SheetMode =
  | { type: 'addDriver' }
  | { type: 'addShift'; driverId: string; driverName: string }
  | null;

export default function Drivers({ partnerView }: Props) {
  const [drivers, setDrivers] = useState<DriverWithShifts[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [driverForm, setDriverForm] = useState({ name: '', weekly_wage: '' });
  const [shiftForm, setShiftForm] = useState({
    amount: '',
    shift_date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [driversRes, shiftsRes] = await Promise.all([
      supabase.from('drivers').select('*').order('created_at'),
      supabase.from('extra_shifts').select('*').order('shift_date', { ascending: false }),
    ]);
    const driversData = driversRes.data || [];
    const shiftsData = shiftsRes.data || [];
    setDrivers(driversData.map(d => ({
      ...d,
      shifts: shiftsData.filter(s => s.driver_id === d.id),
    })));
    setLoading(false);
  }

  async function handleAddDriver() {
    if (!driverForm.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('drivers')
      .insert({
        name: driverForm.name.trim(),
        weekly_wage: parseFloat(driverForm.weekly_wage) || 0,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      console.error('Failed to save driver:', error?.message);
      return;
    }
    // Prepend the new driver directly into state — no reload needed
    setDrivers(prev => [{ ...data, shifts: [] }, ...prev]);
    setDriverForm({ name: '', weekly_wage: '' });
    setSheet(null);
  }

  async function handleAddShift(driverId: string) {
    if (!shiftForm.amount) return;
    setSaving(true);
    await supabase.from('extra_shifts').insert({
      driver_id: driverId,
      amount: parseFloat(shiftForm.amount),
      shift_date: shiftForm.shift_date,
      note: shiftForm.note.trim(),
    });
    setShiftForm({ amount: '', shift_date: new Date().toISOString().slice(0, 10), note: '' });
    setSheet(null);
    setSaving(false);
    loadData();
  }

  async function handleDeleteShift(id: string) {
    await supabase.from('extra_shifts').delete().eq('id', id);
    loadData();
  }

  async function handleDeleteDriver(id: string) {
    await supabase.from('drivers').delete().eq('id', id);
    loadData();
  }

  return (
    <div>
      <header className="page-header">
        <h1>Drivers</h1>
        <p>Manage drivers and extra shifts</p>
      </header>

      <main className="page-content">
        <div className="row-header">
          <p className="section-title">
            {drivers.length} Driver{drivers.length !== 1 ? 's' : ''}
          </p>
          {!partnerView && (
            <button className="btn btn-brand btn-sm" onClick={() => setSheet({ type: 'addDriver' })}>
              <PlusIcon /> Add Driver
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
            <p>No drivers yet.<br />Tap Add Driver to get started.</p>
          </div>
        ) : (
          drivers.map(driver => {
            const shiftsTotal = driver.shifts
  .filter(sh => new Date(sh.shift_date) >= new Date('2026-04-26'))
  .reduce((s, sh) => s + Number(sh.amount), 0);
            return (
              <div key={driver.id} className="driver-card">
                <div className="driver-card-header">
                  <div>
                    <div className="driver-name">{driver.name}</div>
                    <div className="driver-meta">
                      Weekly wage: <strong style={{ color: 'var(--neutral-700)' }}>{fmt(driver.weekly_wage)}</strong>
                      {shiftsTotal > 0 && (
                        <> &nbsp;+&nbsp; Extra: <strong style={{ color: 'var(--success)' }}>{fmt(shiftsTotal)}</strong></>
                      )}
                    </div>
                  </div>
                  <div className="driver-actions">
                    {!partnerView && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setShiftForm({ amount: '', shift_date: new Date().toISOString().slice(0, 10), note: '' });
                            setSheet({ type: 'addShift', driverId: driver.id, driverName: driver.name });
                          }}
                        >
                          + Shift
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '6px' }}
                          onClick={() => handleDeleteDriver(driver.id)}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {driver.shifts.length > 0 && (
                  <div className="shift-list">
                    <div className="shift-list-title">Extra Shifts</div>
                   {driver.shifts.filter(sh => new Date(sh.shift_date) >= new Date('2026-04-26')).map(shift => (
                      <div key={shift.id} className="shift-item">
                        <div>
                          <span>{new Date(shift.shift_date).toLocaleDateString('en-GB')}</span>
                          {shift.note && (
                            <span style={{ color: 'var(--neutral-400)', marginLeft: 6, fontSize: '0.75rem' }}>
                              {shift.note}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="shift-amount">{fmt(shift.amount)}</span>
                          {!partnerView && (
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '2px' }}
                              onClick={() => handleDeleteShift(shift.id)}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Add Driver Sheet */}
      {sheet?.type === 'addDriver' && (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Add New Driver</p>
            <div className="form-group">
              <label className="form-label">Driver Name</label>
              <input
                className="form-input"
                placeholder="Full name"
                value={driverForm.name}
                onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Weekly Wage (£)</label>
              <input
                className="form-input"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={driverForm.weekly_wage}
                onChange={e => setDriverForm(f => ({ ...f, weekly_wage: e.target.value }))}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddDriver} disabled={saving}>
                {saving ? 'Saving...' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Extra Shift Sheet */}
      {sheet?.type === 'addShift' && (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Extra Shift — {sheet.driverName}</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pay Amount (£)</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={shiftForm.amount}
                  onChange={e => setShiftForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={shiftForm.shift_date}
                  onChange={e => setShiftForm(f => ({ ...f, shift_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Covered Route B"
                value={shiftForm.note}
                onChange={e => setShiftForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn btn-success" onClick={() => handleAddShift(sheet.driverId)} disabled={saving}>
                {saving ? 'Saving...' : 'Add Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
