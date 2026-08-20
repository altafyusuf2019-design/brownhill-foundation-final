import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import logo from '../assets/sato-512-name.png';

const ADMIN_EMAIL = 'satosheuk@gmail.com';

interface Props {
  children: ReactNode;
  onSession: (session: Session | null) => void;
}

export default function AuthGuard({ children, onSession }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      onSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      onSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [onSession]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
      setError('Access denied. Unauthorised email address.');
      return;
    }

    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (authError) {
      setError('Incorrect password. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo-wrap">
            <img src={logo} alt="Sato Transport" className="auth-logo" />
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Admin Portal</h1>
            <p className="auth-subtitle">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="auth-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-brand btn-full auth-submit"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer-note">Authorised personnel only</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
