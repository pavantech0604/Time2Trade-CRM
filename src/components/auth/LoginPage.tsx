import React, { useState, useEffect, useRef } from 'react';
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
import { AuthShell } from './AuthShell';
import { EmployeeRecoveryForm } from './EmployeeRecoveryForm';
import { normalizeLoginIdentifier } from '../../lib/loginIdentifier';
import { employeeRecovery, isEmployeeRecoveryEnabled } from '../../lib/employeeRecovery';

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
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (errorMsg) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'nearest' }); } }, [errorMsg]);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [recoveryTicket, setRecoveryTicket] = useState<string | null>(null);
  const [recoveryExpiresAt, setRecoveryExpiresAt] = useState<string | undefined>();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const recoveryView = isRecoveryMode || Boolean(recoveryTicket);

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
      if (isRecoveryMode) {
        const recovery = await employeeRecovery({ action: 'start', email: normalizeLoginIdentifier(email), password });
        if (recovery.success && recovery.recoveryToken) {
          setRecoveryTicket(recovery.recoveryToken);
          setRecoveryExpiresAt(recovery.expiresAt);
          setPassword('');
        } else {
          setErrorMsg(recovery.message || 'Your email or recovery code was not accepted. Use your approved employee account.');
        }
        return;
      }
      const res = await login(email.trim(), password);

      if (!res.success) {
        if (res.status === 'password_reset_required' && res.recoveryToken) {
          setPassword('');
          setRecoveryTicket(res.recoveryToken);
          setRecoveryExpiresAt(res.recoveryExpiresAt);
          setIsRecoveryMode(true);
          return;
        }
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
    <AuthShell mode={recoveryView ? "recovery" : "login"}>
        {/* Card Form */}
        <div className="auth-card">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-[#312e81]">{recoveryView ? "Reset your password" : "Staff Sign In"}</h2>
            <p className="text-xs text-slate-500">
              {recoveryView ? "For approved employees. Your mailbox is not needed." : "Enter your authorized staff credentials to continue to your workspace."}
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
            <div role="alert" ref={errorRef} tabIndex={-1} className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {recoveryTicket ? <EmployeeRecoveryForm key={recoveryTicket} ticket={recoveryTicket} email={normalizeLoginIdentifier(email)} expiresAt={recoveryExpiresAt}
            onCancel={() => { setRecoveryTicket(null); setPassword(''); setErrorMsg(null); }}
            onComplete={async newPassword => {
              const result = await login(email.trim(), newPassword);
              if (!result.success) {
                setRecoveryTicket(null);
                setIsRecoveryMode(false);
                setErrorMsg(`Your password was saved. ${result.message || 'Sign in with your new password.'}`);
              }
            }} /> : <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                Login Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#14B8A6] transition-colors" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered login email"
                  aria-describedby="login-email-help"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all shadow-inner"
                />
              </div>
              <p id="login-email-help" className="text-[11px] text-slate-500">
                Use the email assigned to your account, including internal staff login addresses.
              </p>
              {isEmployeeRecoveryEnabled && <p className="text-[11px] text-blue-700">
                {isRecoveryMode ? "Step 1 of 2: enter the recovery code provided by your administrator. You will choose your own password next." : "Employee password recovery works here without an email inbox."}
              </p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 block font-mono uppercase">
                  {isRecoveryMode ? "Recovery code" : "Password"}
                </label>
                {isEmployeeRecoveryEnabled && <button type="button" onClick={() => { setIsRecoveryMode(!isRecoveryMode); setPassword(''); setErrorMsg(null); setPendingMsg(null); }} className="min-h-9 px-1 text-xs font-semibold text-teal-700 hover:underline">{isRecoveryMode ? "Use my password" : "Forgot password?"}</button>}
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#14B8A6] transition-colors" />
                <input
                  id="login-password"
                  name={isRecoveryMode ? 'recovery-code' : 'password'}
                  autoComplete={isRecoveryMode ? 'off' : 'current-password'}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRecoveryMode ? "Enter your employee recovery code" : "••••••••••••"}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all shadow-inner"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                  {isRecoveryMode ? "Continue to new password" : "Sign In to Workspace"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>}

          {/* New Employee Signup Link */}
          {onNavigateToSignup && !recoveryView && (
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

    </AuthShell>
  );
};
