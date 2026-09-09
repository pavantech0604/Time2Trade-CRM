import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Lock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const PasswordResetModal: React.FC = () => {
  const { currentUser, updatePassword, setMustResetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  if (!currentUser) return null;

  // Real-time requirement checks
  const hasMinLength = newPassword.length >= 6;
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const hasMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const hasMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Strength score: 0 to 4
  const calculateStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (hasMixedCase) score += 1;
    if (hasNumberOrSymbol) score += 1;
    return score;
  };

  const strength = calculateStrength();

  const getStrengthMeta = () => {
    switch (strength) {
      case 0:
        return { label: 'Too Short', color: 'text-slate-400', barBg: 'bg-slate-200' };
      case 1:
        return { label: 'Weak', color: 'text-rose-600 font-bold', barBg: 'bg-rose-500' };
      case 2:
        return { label: 'Fair', color: 'text-amber-600 font-bold', barBg: 'bg-amber-500' };
      case 3:
        return { label: 'Good', color: 'text-blue-600 font-bold', barBg: 'bg-blue-500' };
      case 4:
        return { label: 'Strong & Secure', color: 'text-emerald-600 font-black', barBg: 'bg-emerald-500' };
      default:
        return { label: 'Weak', color: 'text-slate-500', barBg: 'bg-slate-200' };
    }
  };

  const isReadyToSubmit = hasMinLength && hasMatch && !isLoading;

  const handleGenerateStrong = () => {
    const prefixes = ['Trade', 'Alpha', 'Quantum', 'Nexus', 'Vertex', 'Bullish', 'Swift'];
    const specials = ['@', '#', '!', '$', '%', '&'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSpecial = specials[Math.floor(Math.random() * specials.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generated = `${randomPrefix}${randomSpecial}${randomNum}`;

    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNew(true);
    setShowConfirm(true);
    setErrorMsg(null);

    // Auto copy
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generated).then(() => {
        setCopiedGenerated(true);
        setTimeout(() => setCopiedGenerated(false), 2500);
      }).catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setMustResetPassword(false);
        }, 2000);
      } else {
        setErrorMsg(res.message || 'Could not update password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setMustResetPassword(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Top vibrant brand bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-400" />

        {isSuccess ? (
          <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Security Credentials Updated!</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Your permanent password is now active. You will use this password for all future sign-ins to Time2Trade CRM.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setMustResetPassword(false)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Access Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
                <KeyRound className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Set Permanent Password
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wider font-mono">
                    First-Time Setup
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Welcome, <strong className="text-slate-800">{currentUser.name}</strong>! You authenticated with a temporary credential (<code className="text-blue-700 font-mono font-bold">T2T@...</code>). Please establish your secure personal password.
                </p>
              </div>
            </div>

            {/* Quick Generator Button */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px] font-medium">Need a secure memorable password?</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateStrong}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap active:scale-95"
              >
                {copiedGenerated ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Applied & Copied!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Auto-Generate Strong Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2 animate-in shake">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Permanent Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase font-mono tracking-wider">
                    New Permanent Password *
                  </label>
                  {newPassword && (
                    <span className={`text-[10px] font-mono ${getStrengthMeta().color}`}>
                      {getStrengthMeta().label}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showNew ? 'Hide Password' : 'Show Password'}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 4-Segment Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          strength >= step ? getStrengthMeta().barBg : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase font-mono tracking-wider">
                    Confirm Permanent Password *
                  </label>
                  {hasMatch && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Passwords match
                    </span>
                  )}
                  {hasMismatch && (
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-500" /> Passwords do not match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all shadow-inner ${
                      hasMatch
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : hasMismatch
                        ? 'border-rose-300 bg-rose-50/20'
                        : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showConfirm ? 'Hide Password' : 'Show Password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Interactive Requirements Checklist */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-1.5 text-[11px]">
                <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                  Password Requirements:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasMixedCase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {hasMixedCase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
                    <span>Upper & lowercase</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {hasNumberOrSymbol ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
                    <span>Number or symbol</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasMatch ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {hasMatch ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />}
                    <span>Both match</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
                  title="Minimize to dashboard top banner"
                >
                  Later
                </button>

                <button
                  type="submit"
                  disabled={!isReadyToSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Permanent Key...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      <span>Confirm & Secure Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
