import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackgroundEffects } from '../common/BackgroundEffects';

interface LoginPageProps {
  onNavigateToSignup?: () => void;
  onNavigateToPending?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToSignup,
  onNavigateToPending,
}) => {
  const { login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPendingMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLocalLoading(true);
    try {
      const res = await login(email.trim(), password);

      if (!res.success) {
        if (res.status === 'pending') {
          setPendingMsg(res.message || 'Your account is pending admin approval.');
        } else {
          setErrorMsg(res.message || 'Invalid email or password. Please verify your credentials.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
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
            <h2 className="text-lg font-bold text-[#312e81]">Staff Sign In</h2>
            <p className="text-xs text-slate-500">
              Enter your authorized staff credentials to continue to your workspace.
            </p>
          </div>

          {/* Pending Approval Notice */}
          {pendingMsg && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold font-mono uppercase">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                Account Pending Review
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">{pendingMsg}</p>
              {onNavigateToPending && (
                <button
                  type="button"
                  onClick={onNavigateToPending}
                  className="text-amber-600 hover:underline font-bold text-[11px] block mt-1"
                >
                  View Application Status →
                </button>
              )}
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Official Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#14B8A6] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@time2trade.com or gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#14B8A6] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#312e81] border border-[#0ea5e9]/35 hover:bg-[#28256a] hover:border-[#0ea5e9] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#312e81]/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* New Employee Signup Link */}
          {onNavigateToSignup && (
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                New staff member?{' '}
                <button
                  type="button"
                  onClick={onNavigateToSignup}
                  className="text-[#14B8A6] hover:text-[#15803D] font-bold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
          <span>Encrypted Session • Automatic Role Detection</span>
        </div>
      </div>
    </div>
  );
};
