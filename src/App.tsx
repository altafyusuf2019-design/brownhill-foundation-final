import { useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import logo from './assets/sato-512-name.png';
import Home from './pages/Home';
import Drivers from './pages/Drivers';
import Expenses from './pages/Expenses';
import PartnerReport from './pages/PartnerReport';
import DriverLedger from './pages/DriverLedger';
import Vehicles from './pages/Vehicles';
import AuthGuard from './components/AuthGuard';
import { supabase } from './lib/supabase';

type Page = 'home' | 'drivers' | 'expenses' | 'report' | 'ledger' | 'vehicles';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function DriversIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <path d="M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h2M12 15h2" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function VehiclesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [partnerView, setPartnerView] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const handleSession = useCallback((s: Session | null) => setSession(s), []);

  return (
    <AuthGuard onSession={handleSession}>
    <div className="app-shell">
      {/* Logo Bar */}
      <div className="logo-bar">
        <img src={logo} alt="Satoshe AI" />
        {session && (
          <button
            className="signout-btn"
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            aria-label="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Page Content */}
      {page === 'home' && <Home partnerView={partnerView} />}
      {page === 'drivers' && <Drivers partnerView={partnerView} />}
      {page === 'ledger' && <DriverLedger partnerView={partnerView} />}
      {page === 'expenses' && <Expenses partnerView={partnerView} />}
      {page === 'vehicles' && <Vehicles partnerView={partnerView} />}
      {page === 'report' && (
        <PartnerReport
          partnerView={partnerView}
          onTogglePartnerView={() => setPartnerView(v => !v)}
        />
      )}

      {/* Bottom Navigation — only shown when logged in */}
      <nav className="bottom-nav">
        <button
          className={`nav-item${page === 'home' ? ' active' : ''}`}
          onClick={() => setPage('home')}
        >
          <HomeIcon />
          Home
        </button>
        <button
          className={`nav-item${page === 'drivers' ? ' active' : ''}`}
          onClick={() => setPage('drivers')}
        >
          <DriversIcon />
          Drivers
        </button>
        <button
          className={`nav-item${page === 'ledger' ? ' active' : ''}`}
          onClick={() => setPage('ledger')}
        >
          <LedgerIcon />
          Pay Hub
        </button>
        <button
          className={`nav-item${page === 'expenses' ? ' active' : ''}`}
          onClick={() => setPage('expenses')}
        >
          <ExpensesIcon />
          Expenses
        </button>
        <button
          className={`nav-item${page === 'vehicles' ? ' active' : ''}`}
          onClick={() => setPage('vehicles')}
        >
          <VehiclesIcon />
          Garage
        </button>
        <button
          className={`nav-item${page === 'report' ? ' active' : ''}`}
          onClick={() => setPage('report')}
        >
          <ReportIcon />
          Report
        </button>
      </nav>
    </div>
    </AuthGuard>
  );
}
