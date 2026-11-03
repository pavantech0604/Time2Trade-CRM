import React, { useState } from 'react';
import { employeeRecovery } from '../../lib/employeeRecovery';

interface Props {
  ticket: string;
  onComplete: (password: string) => Promise<void>;
  onCancel: () => void;
}

export const EmployeeRecoveryForm: React.FC<Props> = ({ ticket, onComplete, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      await onComplete(password);
    } catch {
      setError('Your password could not be saved. Try again or contact an administrator.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-bold text-sm text-blue-950">Choose your new password</h3>
        <p className="mt-1 text-xs text-blue-800">Save a personal password to continue to your account. This request expires in 5 minutes.</p>
      </div>
      {error && <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">{error}</div>}
      <div className="space-y-1.5">
        <label htmlFor="employee-new-password" className="block text-xs font-semibold text-slate-600">New password</label>
        <input id="employee-new-password" type={visible ? 'text' : 'password'} autoComplete="new-password"
          required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="employee-confirm-password" className="block text-xs font-semibold text-slate-600">Confirm new password</label>
        <input id="employee-confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password"
          required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} /> Show passwords
      </label>
      <button type="submit" disabled={busy || restart} className="w-full rounded-xl bg-[#312e81] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">
        {busy ? 'Saving password…' : 'Save password & sign in'}
      </button>
      <button type="button" disabled={busy} onClick={onCancel} className="w-full text-xs font-semibold text-slate-600 disabled:opacity-50">
        {restart ? 'Start recovery again' : 'Back to sign in'}
      </button>
    </form>
  );
};
