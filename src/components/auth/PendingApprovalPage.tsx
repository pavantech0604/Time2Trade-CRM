import React from 'react';
import {
  Building2,
  Clock,
  ShieldCheck,
  Mail,
  ArrowLeft,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';
import { BackgroundEffects } from '../common/BackgroundEffects';

interface PendingApprovalPageProps {
  onBackToLogin: () => void;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onBackToLogin }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      <BackgroundEffects />

      <div className="max-w-md w-full relative z-10 space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src="/logo-tight.png" alt="Time2Trade Logo" className="w-56 h-auto object-contain mx-auto mb-1 drop-shadow-md" />
        </div>

        {/* Card Form */}
        <div className="bg-white/95 backdrop-blur-xl border border-[#0ea5e9]/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#312e81]/10 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#312e81] font-heading">
              Application Under Review
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your employee registration has been securely received. To maintain strict operational compliance, your account must be reviewed by an administrator before dashboard access is unlocked.
            </p>
          </div>

          {/* Onboarding Stages */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-slate-200 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
              <span className="text-xs text-slate-700">Registration credentials verified</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
              <span className="text-xs text-amber-700 font-semibold">
                Admin role assignment (Admin / Employee)
              </span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-4 h-4 rounded-full bg-slate-400 shrink-0" />
              <span className="text-xs text-slate-500">Workspace activation</span>
            </div>
          </div>

          {/* Compliance Contact */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-slate-200 text-xs text-slate-600 text-left flex items-start gap-3">
            <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Need expedited onboarding?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Contact the compliance desk at{' '}
                <a href="mailto:karthik@time2trade.com" className="text-blue-650 hover:underline font-semibold">
                  karthik@time2trade.com
                </a>
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={onBackToLogin}
            className="w-full py-3 px-4 bg-[#312e81] border border-[#0ea5e9]/35 hover:bg-[#28256a] hover:border-[#0ea5e9] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#312e81]/15"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            Return to Staff Sign In
          </button>
        </div>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0ea5e9]" />
          <span>Zero Client Role Escalation Policy Enforced</span>
        </div>
      </div>
    </div>
  );
};
