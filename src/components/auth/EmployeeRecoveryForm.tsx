import React, { useState, useEffect, useRef } from 'react';
import { Check, Clock, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { employeeRecovery } from '../../lib/employeeRecovery';

interface Props {
  ticket: string;
  email?: string;
  expiresAt?: string;
  onComplete: (password: string) => Promise<void>;
  onCancel: () => void;
}

export const EmployeeRecoveryForm: React.FC<Props> = ({ ticket, email, expiresAt, onComplete, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [deadline] = useState(() => Date.parse(expiresAt || '') || Date.now() + 5 * 60_000);
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    passwordRef.current?.focus();
    const timer = setInterval(() => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => { if (error) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'nearest' }); } }, [error]);
  const expired = seconds <= 0;
  const strength = [password.length >= 8, password.length >= 12, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password) && /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const suggestPassword = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const suggestion = 'Tt!7' + [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    setPassword(suggestion); setConfirmation(suggestion); setVisible(true); setGenerated(true); setError('');
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (expired || restart) return setError('This request has expired. Start recovery again.');
    if (password.length < 8 || password.length > 128) return setError('Use 8–128 characters for your new password.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setBusy(true);
    setError('');
    try {
      const result = await employeeRecovery({ action: 'finish', ticket, newPassword: password });
      if (!result.success) {
        setError(result.message || 'Your password could not be saved.');
        setRestart(Boolean(result.restart));
        return;
      }
      setSaved(true);
      await onComplete(password);
    } catch {
      setError('Your password could not be saved. Try again or contact an administrator.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500" aria-label="Recovery progress">
        <span className="inline-flex items-center gap-1 text-teal-700"><Check size={13} /> Account verified</span>
        <span aria-hidden="true">/</span><span className="text-slate-900">Choose password</span>
      </div>
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4">
        <div className="flex items-center gap-2 text-teal-800"><KeyRound size={17} /><h3 className="font-bold text-sm">Make it your own</h3></div>
        {email && <p className="mt-2 break-all text-xs font-medium text-slate-700">{email}</p>}
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Set a personal password to open your workspace. No email confirmation is needed.</p>
        <p className={`mt-3 flex items-center gap-1.5 text-[11px] font-semibold ${seconds < 60 ? 'text-amber-700' : 'text-teal-700'}`}><Clock size={12} />{expired ? 'Reset request expired' : `Time remaining: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</p>
      </div>
      {(error || expired) && <div role="alert" ref={errorRef} tabIndex={-1} className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">{expired ? 'This reset request expired. Start recovery again to get a fresh request.' : error}</div>}
      {saved && <p role="status" className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-800"><Check size={16} />Password saved. Signing you in…</p>}
      <div className="space-y-1.5">
        <label htmlFor="employee-new-password" className="block text-xs font-semibold text-slate-600">New password</label>
        <input ref={passwordRef} id="employee-new-password" type={visible ? 'text' : 'password'} autoComplete="new-password"
          required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        <div className="flex gap-1" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength}>
          {[1,2,3,4].map(level => <span key={level} className={`h-1 flex-1 rounded-full ${strength >= level ? strength >= 3 ? 'bg-teal-500' : 'bg-amber-400' : 'bg-slate-100'}`} />)}
        </div>
        <p className="text-[11px] text-slate-500">At least 8 characters. Choose a password different from the shared recovery code.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="employee-confirm-password" className="block text-xs font-semibold text-slate-600">Confirm new password</label>
        <input id="employee-confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password"
          required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        {confirmation && <p aria-live="polite" className={`text-[11px] ${password === confirmation ? 'text-teal-700' : 'text-amber-700'}`}>{password === confirmation ? 'Passwords match' : 'Passwords do not match yet'}</p>}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} /> Show passwords
      </label>
      <button type="button" disabled={busy || expired || restart || saved} onClick={suggestPassword} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"><Sparkles size={14} />Suggest a strong password</button>
      {generated && <p role="status" className="text-[11px] text-slate-500">Suggested password filled in. Save it in your password manager before continuing.</p>}
      <button type="submit" disabled={busy || restart || expired || saved || password.length < 8 || password !== confirmation} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#312e81] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">
        {busy && <Loader2 size={15} className="animate-spin" />}{saved ? 'Signing you in…' : busy ? 'Saving password…' : 'Save password & sign in'}
      </button>
      <button type="button" disabled={busy} onClick={onCancel} className="w-full text-xs font-semibold text-slate-600 disabled:opacity-50">
        {restart || expired ? 'Start recovery again' : 'Back to recovery'}
      </button>
    </form>
  );
};
