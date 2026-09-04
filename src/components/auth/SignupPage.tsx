import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackgroundEffects } from '../common/BackgroundEffects';

interface SignupPageProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
}) => {
  const { signup, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Good', color: 'bg-amber-400' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-400' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLocalLoading(true);

    try {
      const res = await signup(fullName.trim(), email.trim(), password, phone.trim());
      if (res.success) {
        onSignupSuccess();
      } else {
        setErrorMsg(res.message || 'Failed to complete registration.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration error.');
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = localLoading || authLoading;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      <BackgroundEffects />

      <div className="max-w-md w-full relative z-10 space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src="/logo-tight.png" alt="Time2Trade Logo" className="w-56 h-auto object-contain mx-auto mb-1 drop-shadow-md" />
        </div>

        {/* Card Form */}
        <div className="bg-white/95 backdrop-blur-xl border border-[#0ea5e9]/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#312e81]/10 space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-[#312e81]">Create Employee Account</h2>
            <p className="text-xs text-slate-500">
              Submit your credentials. An administrator will review and assign your role.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Full Name *
              </label>
              <div className="relative group">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#0ea5e9] transition-colors" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Email Address (Gmail / Corporate) *
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#0ea5e9] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Contact Phone (Optional)
              </label>
              <div className="relative group">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#0ea5e9] transition-colors" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Create Password *
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#0ea5e9] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Strength</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full ${strength.score >= 1 ? strength.color : 'bg-transparent'} flex-1 rounded-full transition-all`} />
                    <div className={`h-full ${strength.score >= 2 ? strength.color : 'bg-transparent'} flex-1 rounded-full transition-all`} />
                    <div className={`h-full ${strength.score >= 3 ? strength.color : 'bg-transparent'} flex-1 rounded-full transition-all`} />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Confirm Password *
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#0ea5e9] transition-colors" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#312e81] border border-[#0ea5e9]/35 hover:bg-[#28256a] hover:border-[#0ea5e9] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#312e81]/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  Submit for Approval
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an approved account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-[#0ea5e9] hover:text-[#15803D] font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0ea5e9]" />
          <span>Role Assigned Post-Approval • Cryptographically Verified</span>
        </div>
      </div>
    </div>
  );
};
