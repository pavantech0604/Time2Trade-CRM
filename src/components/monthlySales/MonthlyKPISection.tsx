import React from 'react';
import { MonthlySalesSummary } from '../../types';
import { formatINR } from '../../lib/formatters';
import {
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyKPISectionProps {
  summary: MonthlySalesSummary;
  userRole?: string;
  isLoading?: boolean;
}

export const MonthlyKPISection: React.FC<MonthlyKPISectionProps> = ({
  summary,
  userRole = 'admin',
  isLoading = false,
}) => {
  const isEmployee = userRole === 'employee';

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 animate-pulse shadow-sm h-36 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-9 w-9 bg-slate-100 rounded-2xl" />
            </div>
            <div className="h-8 w-36 bg-slate-100 rounded" />
            <div className="h-2.5 w-full bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {/* ── 1. Total Verified Revenue (Hero Card) ── */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 border border-emerald-200/90 rounded-3xl p-5 space-y-3 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider font-mono">
            {isEmployee ? 'My Credited Revenue' : 'Total Revenue'}
          </span>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div
            className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono whitespace-nowrap"
            title={formatINR(summary.totalRevenue)}
          >
            {formatINR(summary.totalRevenue)}
          </div>

          {/* MoM Performance Pill */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {summary.revenueMomStatus === 'up' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono shadow-2xs">
                <ArrowUpRight className="w-3 h-3 text-emerald-700" />
                +{summary.revenueMomPercent}% MoM
              </span>
            )}
            {summary.revenueMomStatus === 'down' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold font-mono shadow-2xs">
                <ArrowDownRight className="w-3 h-3 text-rose-700" />
                {summary.revenueMomPercent}% MoM
              </span>
            )}
            {summary.revenueMomStatus === 'no_baseline' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold font-mono">
                <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                Launch Benchmark
              </span>
            )}
            {summary.revenueMomStatus === 'neutral' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                <Minus className="w-2.5 h-2.5" />
                0% MoM
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Prev: {formatINR(summary.prevMonthRevenue)}</span>
          <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </span>
        </div>
      </div>

      {/* ── 2. Total Sales Closed Card ── */}
      <div className="bg-gradient-to-br from-blue-500/10 via-white to-indigo-500/5 border border-blue-200/90 rounded-3xl p-5 space-y-3 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-800 uppercase tracking-wider font-mono">
            Total Sales Closed
          </span>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {summary.totalSales}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">Deals completed</span>
            <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              100% Approved
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium font-mono">
          <span>Active volume</span>
          <span className="text-blue-700 font-bold">{summary.period.shortLabel}</span>
        </div>
      </div>

      {/* ── 3. Client Conversions & Traders Card ── */}
      <div className="bg-gradient-to-br from-cyan-500/10 via-white to-teal-500/5 border border-cyan-200/90 rounded-3xl p-5 space-y-3 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-cyan-800 uppercase tracking-wider font-mono">
            Traders Converted
          </span>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {summary.conversionsCount}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-2">
            Active trading accounts onboarded
          </p>
        </div>

        <div className="pt-2 border-t border-cyan-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium font-mono">
          <span>Conversion Efficiency</span>
          <span className="font-bold text-cyan-800">
            {summary.totalLeadsInPeriod > 0 ? `${summary.conversionRate}% Rate` : 'Direct Onboarding'}
          </span>
        </div>
      </div>

      {/* ── 4. Executive Settlement Share (60/40 Split) ── */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-white to-purple-500/5 border border-indigo-200/90 rounded-3xl p-5 space-y-3 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider font-mono">
            {isEmployee ? 'Market Breakdown' : 'Executive Split (60/40)'}
          </span>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            {isEmployee ? <Layers className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          </div>
        </div>

        {isEmployee ? (
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Equity:</span>
              <span className="font-black text-slate-900">{formatINR(summary.equitySales)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-1">
              <span className="text-slate-500">Commodity:</span>
              <span className="font-black text-slate-900">{formatINR(summary.commoditySales)}</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-purple-700 font-bold">Manager (60%):</span>
              <span className="font-black text-purple-950 font-mono">{formatINR(summary.managerShare)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-1.5">
              <span className="text-blue-700 font-bold">Company (40%):</span>
              <span className="font-black text-blue-950 font-mono">{formatINR(summary.companyRetainedShare)}</span>
            </div>

            {/* Split visual bar */}
            <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2.5 overflow-hidden flex">
              <div className="bg-purple-600 h-full" style={{ width: '60%' }} title="Manager 60%" />
              <div className="bg-blue-600 h-full" style={{ width: '40%' }} title="Company 40%" />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Settlement Pool</span>
          <span className="font-mono text-indigo-700 font-bold">
            {isEmployee ? `${summary.sharedPaymentsCount} Shared Deals` : 'Platform Collections'}
          </span>
        </div>
      </div>
    </div>
  );
};
