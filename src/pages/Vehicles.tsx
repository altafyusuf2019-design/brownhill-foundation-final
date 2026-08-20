import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Vehicle } from '../lib/supabase';

interface Props {
  partnerView: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const ALERT_THRESHOLD = 500;

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

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

type VehicleExpenseSummary = Vehicle & { monthCost: number };

export default function Vehicles({ partnerView }: Props) {
  const [vehicles, setVehicles] = useState<VehicleExpenseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState({ registration: '', make_model: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [vehiclesRes, expensesRes] = await Promise.all([
      supabase.from('vehicles').select('*').order('registration'),
      supabase
        .from('expenses')
        .select('vehicle_reg, total_cost')
        .gte('expense_date', monthStart),
    ]);
    const vehiclesData = vehiclesRes.data || [];
    const expensesData = expensesRes.data || [];

    // Build a map of reg -> this month's cost
    const costMap: Record<string, number> = {};
    for (const e of expensesData) {
      if (e.vehicle_reg) {
        costMap[e.vehicle_reg] = (costMap[e.vehicle_reg] || 0) + Number(e.total_cost);
      }
    }

    setVehicles(vehiclesData.map(v => ({
      ...v,
      monthCost: costMap[v.registration] || 0,
    })));
    setLoading(false);
  }

  async function handleAddVehicle() {
    if (!form.registration.trim()) return;
    setSaving(true);
    await supabase.from('vehicles').insert({
      registration: form.registration.trim().toUpperCase(),
      make_model: form.make_model.trim(),
    });
    setForm({ registration: '', make_model: '' });
    setShowSheet(false);
    setSaving(false);
    loadData();
  }

  async function handleDeleteVehicle(id: string) {
    await supabase.from('vehicles').delete().eq('id', id);
    loadData();
  }

  const now = new Date();
  const monthLabel = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const alertCount = vehicles.filter(v => v.monthCost > ALERT_THRESHOLD).length;

  return (
    <div>
      <header className="page-header">
        <h1>Garage</h1>
        <p>Fleet management &amp; maintenance costs</p>
      </header>

      <main className="page-content">
        {alertCount > 0 && (
          <div className="fleet-alert-banner">
            <WarningIcon />
            <span>
              {alertCount} vehicle{alertCount !== 1 ? 's' : ''} exceeded £{ALERT_THRESHOLD} maintenance this month
            </span>
          </div>
        )}

        <div className="row-header">
          <p className="section-title">
            {vehicles.length} Vehicle{vehicles.length !== 1 ? 's' : ''}
          </p>
          {!partnerView && (
            <button className="btn btn-brand btn-sm" onClick={() => setShowSheet(true)}>
              <PlusIcon /> Add Vehicle
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <p>No vehicles added yet.<br />Tap Add Vehicle to get started.</p>
          </div>
        ) : (
          <>
            {/* Fleet summary table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--neutral-100)' }}>
                <div className="report-card-title">
                  Fleet Summary — {monthLabel}
                </div>
              </div>
              <table className="report-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Make / Model</th>
                    <th className="td-right">Maint. Cost</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id} className={v.monthCost > ALERT_THRESHOLD ? 'fleet-row-alert' : ''}>
                      <td>
                        <span className="reg-badge">{v.registration}</span>
                        {v.monthCost > ALERT_THRESHOLD && (
                          <span className="fleet-warn-icon"><WarningIcon /></span>
                        )}
                      </td>
                      <td style={{ color: 'var(--neutral-500)', fontSize: '0.82rem' }}>
                        {v.make_model || '—'}
                      </td>
                      <td className={`td-right ${v.monthCost > ALERT_THRESHOLD ? 'red' : ''}`}>
                        {fmt(v.monthCost)}
                      </td>
                      <td>
                        {!partnerView && (
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '4px', display: 'flex' }}
                            onClick={() => handleDeleteVehicle(v.id)}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add Vehicle Sheet */}
      {showSheet && (
        <div className="overlay" onClick={() => setShowSheet(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="sheet-title">Add Vehicle</p>
            <div className="form-group">
              <label className="form-label">Registration Plate</label>
              <input
                className="form-input"
                placeholder="e.g. AB12 CDE"
                value={form.registration}
                onChange={e => setForm(f => ({ ...f, registration: e.target.value }))}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Make / Model (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Ford Transit"
                value={form.make_model}
                onChange={e => setForm(f => ({ ...f, make_model: e.target.value }))}
              />
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddVehicle} disabled={saving}>
                {saving ? 'Saving...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
