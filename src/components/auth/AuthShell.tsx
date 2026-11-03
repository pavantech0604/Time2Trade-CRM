import React from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

export const AuthShell: React.FC<{ mode: 'login' | 'signup'; children: React.ReactNode }> = ({ mode, children }) => (
  <div className="auth-shell">
    <div aria-hidden="true" className="auth-glow auth-glow-one" />
    <div aria-hidden="true" className="auth-glow auth-glow-two" />
    <main className="auth-scroll">
      <div className="auth-layout">
        <aside className="auth-brand">
          <img src="/logo-tight.png" alt="Time2Trade" className="auth-logo" />
          <div className="auth-brand-copy">
            <span className="auth-eyebrow">TIME2TRADE WORKSPACE</span>
            <h1>{mode === 'login' ? 'Your desk.\nYour next move.' : 'A new chapter\nstarts here.'}</h1>
            <p>{mode === 'login' ? 'Track your sales, follow every payment, and keep your team moving.' : 'Create your staff account. Your administrator will review your details and set up your workspace.'}</p>
            <div className="auth-brand-note"><ArrowUpRight size={16} /> Sales, people and progress — together.</div>
          </div>
        </aside>
        <section className="auth-form-column" aria-label={mode === 'login' ? 'Staff sign in' : 'Staff registration'}>
          {children}
          <p className="auth-security"><ShieldCheck size={14} /> Secure sign-in · Access tailored to your role</p>
        </section>
      </div>
    </main>
  </div>
);
