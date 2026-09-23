import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDown,
  ShieldCheck,
  Flame,
  KeyRound,
  Banknote,
  Briefcase,
  Building2,
  Receipt,
  Sparkles,
  Minus,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../common/MetricCard';
import { StatusBadge } from '../common/StatusBadge';
import { StreakBadge } from '../common/StreakBadge';
import { calculateDashboardKPIs, formatINR, formatINRCompact } from '../../lib/calculations';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const {
    leads,
    traders,
    payments,
    expenses,
    managerAdvances,
    currentUser,
    mustResetPassword,
    setMustResetPassword,
  } = useAuth();

  const [consoleView, setConsoleView] = useState<'split' | 'flow'>('split');

  const kpis = calculateDashboardKPIs(leads, traders, payments, expenses);

  const managerShare = kpis.managerShare;
  const companyGrossShare = kpis.companyGrossShare;
  const totalExpenses = kpis.totalExpenses;
  const netCompanyProfit = kpis.netProfit;
  const totalAdvancesGiven = managerAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const netManagerPayable = managerShare - totalAdvancesGiven;

  const getTraderPaymentCount = (trader: any) => {
    return payments.filter(
      (p) =>
        p.status === 'approved' &&
        (p.trader_id === trader.id ||
          (p.client_name && p.client_name.trim().toLowerCase() === trader.name.trim().toLowerCase()))
    ).length;
  };

  const pendingVerificationList = payments.filter((p) => p.status === 'pending_verification');
  const pendingHandoffsList = leads.filter((l) => l.status === 'interested');

  // Dynamically compute last 7 days collections from actual approved payments
  const chartData = React.useMemo(() => {
    const approvedPayments = payments.filter((p) => p.status === 'approved');
    const daysMap = new Map<string, number>();

    // Generate past 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daysMap.set(key, 0);
    }

    // Accumulate amounts
    approvedPayments.forEach((p) => {
      const dateKey = (p.verified_at || p.created_at || '').split('T')[0];
      if (daysMap.has(dateKey)) {
        daysMap.set(dateKey, (daysMap.get(dateKey) || 0) + Number(p.amount || 0));
      }
    });

    return Array.from(daysMap.entries()).map(([dateKey, amount]) => {
      const d = new Date(dateKey + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: label, amount };
    });
  }, [payments]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Interactive Temporary Password Alert Banner */}
      {Boolean(currentUser?.must_reset_password || mustResetPassword) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/10 border border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <KeyRound className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base">Temporary Password Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-mono uppercase font-bold">Action Required</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                You logged into the Command Centre using a temporary credential (<span className="font-mono font-bold text-blue-700">T2T@...</span>). Set your permanent administrative password now.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMustResetPassword(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Set Permanent Password</span>
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time pulse of your trading platform's ecosystem
          </p>
        </div>
      </div>

      {/* 3 Primary Top Platform KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <MetricCard
          title="Active Traders"
          value={kpis.activeTraders}
          isCurrency={false}
          icon={TrendingUp}
          variant="positive"
          subtitle="Funded client trading accounts"
          onClick={() => onNavigate('active-traders')}
        />

        <MetricCard
          title="Total Platform Collections"
          value={kpis.totalProfitShared}
          icon={CreditCard}
          variant="positive"
          subtitle="Verified client platform collections"
          onClick={() => onNavigate('payment-verification')}
        />

        <MetricCard
          title="Net Business Profit"
          value={kpis.netProfit}
          icon={DollarSign}
          variant={kpis.netProfit >= 0 ? 'positive' : 'negative'}
          subtitle="Company Retained Share − Operating Expenses"
          onClick={() => onNavigate('expenses')}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           Revenue Allocation Console — Admin Only
           ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* ── Header ── */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Revenue Allocation</h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Admin</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">60/40 revenue split · Manager settlement status</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary Strip: 4 Key Metrics ── */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Revenue */}
            <div
              onClick={() => onNavigate('payment-verification')}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all group animate-reveal-up stagger-1 min-w-0"
              title={formatINR(kpis.totalProfitShared)}
            >
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">Total Revenue</div>
              <div className="text-base sm:text-xl font-bold text-slate-900 tabular-nums mt-1 truncate">
                {formatINRCompact(kpis.totalProfitShared)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span className="truncate">Verified collections</span>
                <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>

            {/* Company Net Profit */}
            <div
              onClick={() => onNavigate('expenses')}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group animate-reveal-up stagger-2 min-w-0"
              title={formatINR(netCompanyProfit)}
            >
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">Net Profit</div>
              <div className={`text-base sm:text-xl font-bold tabular-nums mt-1 truncate ${netCompanyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatINRCompact(netCompanyProfit)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span className="truncate">After expenses</span>
                <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>

            {/* Manager Share */}
            <div
              onClick={() => onNavigate('employee-sales')}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all group animate-reveal-up stagger-3 min-w-0"
              title={formatINR(managerShare)}
            >
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">Manager Share</div>
              <div className="text-base sm:text-xl font-bold text-purple-800 tabular-nums mt-1 truncate">
                {formatINRCompact(managerShare)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span className="truncate">60% of revenue</span>
                <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>

            {/* Balance Due */}
            <div
              onClick={() => onNavigate('manager-advances')}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group animate-reveal-up stagger-4 min-w-0"
              title={formatINR(netManagerPayable)}
            >
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">Balance Due</div>
              <div className={`text-base sm:text-xl font-bold tabular-nums mt-1 truncate ${netManagerPayable >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatINRCompact(netManagerPayable)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 sm:mt-1 flex items-center justify-between">
                <span className="truncate">After advances</span>
                <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Selector ── */}
        <div className="px-3.5 sm:px-6 pt-3 sm:pt-4 pb-0">
          <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setConsoleView('split')}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                consoleView === 'split'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Financial Breakdown
            </button>
            <button
              type="button"
              onClick={() => setConsoleView('flow')}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                consoleView === 'flow'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Settlement Flow
            </button>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="px-3.5 sm:px-6 py-4 sm:py-6">
          {consoleView === 'split' ? (
            /* ─── Financial Breakdown: Two-Column Ledger ─── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
              {/* Company Allocation Panel */}
              <div className="border border-blue-100 rounded-xl overflow-hidden hover:border-blue-200 transition-all hover:shadow-sm">
                {/* Panel Header */}
                <div className="bg-blue-50/60 px-4 py-3 flex items-center justify-between border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Company Allocation</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-500">40% retained</span>
                </div>

                {/* Ledger Rows */}
                <div className="divide-y divide-slate-100">
                  {/* Company Share */}
                  <div
                    onClick={() => onNavigate('payment-verification')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors group gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">Company Share</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">Gross retained from sales</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap" title={formatINR(companyGrossShare)}>
                        {formatINR(companyGrossShare)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Expenses */}
                  <div
                    onClick={() => onNavigate('expenses')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors group gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 truncate">
                        <Minus className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Expenses Deducted</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 ml-[18px] truncate">{expenses.length} expense record{expenses.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-rose-600 tabular-nums whitespace-nowrap" title={formatINR(totalExpenses)}>
                        {totalExpenses > 0 ? `−${formatINR(totalExpenses)}` : formatINR(0)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div
                    onClick={() => onNavigate('expenses')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-emerald-50/30 transition-colors bg-emerald-50/20 gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-800">Net Operating Profit</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5 truncate">Company Share − Expenses</div>
                    </div>
                    <span
                      className={`text-sm sm:text-base font-bold tabular-nums whitespace-nowrap shrink-0 ${netCompanyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                      title={formatINR(netCompanyProfit)}
                    >
                      {formatINR(netCompanyProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manager Settlement Panel */}
              <div className="border border-purple-100 rounded-xl overflow-hidden hover:border-purple-200 transition-all hover:shadow-sm">
                {/* Panel Header */}
                <div className="bg-purple-50/60 px-4 py-3 flex items-center justify-between border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Manager Settlement</span>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-500">60% share</span>
                </div>

                {/* Ledger Rows */}
                <div className="divide-y divide-slate-100">
                  {/* Manager Share */}
                  <div
                    onClick={() => onNavigate('employee-sales')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors group gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">Manager Share</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">Gross share from platform sales</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap" title={formatINR(managerShare)}>
                        {formatINR(managerShare)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Advances Paid */}
                  <div
                    onClick={() => onNavigate('manager-advances')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors group gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 truncate">
                        <Minus className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Advances Paid</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 ml-[18px] truncate">{managerAdvances.length} advance{managerAdvances.length !== 1 ? 's' : ''} disbursed</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-600 tabular-nums whitespace-nowrap" title={formatINR(totalAdvancesGiven)}>
                        {totalAdvancesGiven > 0 ? `−${formatINR(totalAdvancesGiven)}` : formatINR(0)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Net Payable */}
                  <div
                    onClick={() => onNavigate('manager-advances')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-purple-50/30 transition-colors bg-purple-50/20 gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-purple-800">Balance Due to Manager</div>
                      <div className="text-[10px] text-purple-600 mt-0.5 truncate">Share − Advances Paid</div>
                    </div>
                    <span
                      className={`text-sm sm:text-base font-bold tabular-nums whitespace-nowrap shrink-0 ${netManagerPayable >= 0 ? 'text-purple-800' : 'text-rose-600'}`}
                      title={formatINR(netManagerPayable)}
                    >
                      {formatINR(netManagerPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Settlement Flow: Horizontal Waterfall Stepper ─── */
            <div className="space-y-5">
              {/* Step Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                {/* Step 1: Total Revenue */}
                <div
                  onClick={() => onNavigate('payment-verification')}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all group relative"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold shrink-0">1</div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform Sales</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums truncate" title={formatINR(kpis.totalProfitShared)}>
                    {formatINRCompact(kpis.totalProfitShared)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Total verified collections</div>
                  {/* Connector arrow — hidden on mobile, visible on lg */}
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {/* Step 2: Revenue Split */}
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">2</div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Revenue Split</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-blue-700">Company (40%)</span>
                      <span className="text-xs font-bold text-blue-800 tabular-nums" title={formatINR(companyGrossShare)}>{formatINRCompact(companyGrossShare)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-purple-700">Manager (60%)</span>
                      <span className="text-xs font-bold text-purple-800 tabular-nums" title={formatINR(managerShare)}>{formatINRCompact(managerShare)}</span>
                    </div>
                  </div>
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {/* Step 3: Deductions */}
                <div
                  onClick={() => onNavigate('expenses')}
                  className="bg-rose-50/50 border border-rose-200/70 rounded-xl p-4 cursor-pointer hover:border-rose-300 transition-all relative"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">3</div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Independent Deductions</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-rose-600">Operating Exp (from 40%)</span>
                      <span className="text-xs font-bold text-rose-700 tabular-nums" title={formatINR(totalExpenses)}>−{formatINRCompact(totalExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-purple-700">Manager Adv (from 60%)</span>
                      <span className="text-xs font-bold text-slate-600 tabular-nums" title={formatINR(totalAdvancesGiven)}>−{formatINRCompact(totalAdvancesGiven)}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-2 italic truncate">
                    Advances reduce manager due, not company profit
                  </div>
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>

                {/* Step 4: Final Settlement */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">4</div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Settlement</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-emerald-700">Company Profit</span>
                      <span className={`text-xs font-bold tabular-nums ${netCompanyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`} title={formatINR(netCompanyProfit)}>
                        {formatINRCompact(netCompanyProfit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-purple-700">Manager Due</span>
                      <span className={`text-xs font-bold tabular-nums ${netManagerPayable >= 0 ? 'text-purple-800' : 'text-rose-600'}`} title={formatINR(netManagerPayable)}>
                        {formatINRCompact(netManagerPayable)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick action links below the flow */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('expenses')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Manage Expenses ({expenses.length})</span>
                </button>
                <span className="text-slate-200">·</span>
                <button
                  type="button"
                  onClick={() => onNavigate('manager-advances')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Manage Advances ({managerAdvances.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Alerts Banner */}
      {kpis.pendingVerificationCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => onNavigate('payment-verification')}
            className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  {kpis.pendingVerificationCount} Payment Proofs Pending Verification
                </h4>
                <p className="text-[11px] text-amber-700/80 mt-0.5 font-medium">Requires UTR bank statement check before approval</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-700" />
          </div>
        </div>
      )}

      {/* Main Chart + Lead Funnel Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Profit Shared Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daily Approved Profit Collections</h3>
              <p className="text-xs text-slate-500 font-medium">30-day verified bank collection trend</p>
            </div>
          </div>
          <div className="h-48 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                  formatter={(val: any) => [formatINR(Number(val)), 'Verified Collection']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Lead Stage Distribution</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Advisory onboarding pipeline breakdown</p>

            <div className="space-y-3">
              {[
                { stage: 'New Leads', count: leads.filter((l) => l.status === 'callback_requested').length, color: 'bg-blue-500' },
                { stage: 'Called', count: leads.filter((l) => l.status === 'interested').length, color: 'bg-cyan-500' },
                { stage: 'RM Required', count: leads.filter((l) => l.status === 'interested').length, color: 'bg-purple-500' },
                { stage: 'RM Contacted', count: leads.filter((l) => l.status === 'follow_up_later').length, color: 'bg-indigo-500' },
                { stage: 'Active Trader', count: leads.filter((l) => l.status === 'active_trader').length, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">{item.stage}</span>
                    <span className="text-slate-800">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${Math.min(100, (item.count / Math.max(1, leads.length)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Active Traders List Preview */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Top Performing Active Traders</h3>
          <button
            onClick={() => onNavigate('active-traders')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            View All Traders <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile View: Top Performers Card Stack */}
        <div className="md:hidden block space-y-2.5">
          {traders.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">No active traders registered.</div>
          ) : (
            traders.slice(0, 3).map((trader) => (
              <div 
                key={trader.id} 
                className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{trader.name}</h4>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">RM: {trader.employee_name || 'RM'}</span>
                  </div>
                  <StreakBadge
                    streak={trader.current_streak}
                    paymentCount={getTraderPaymentCount(trader)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider font-bold truncate">Profit Gained</span>
                    <span className="font-extrabold text-emerald-700 block mt-0.5 tabular-nums truncate" title={formatINR(trader.total_profit_gained)}>{formatINR(trader.total_profit_gained)}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[8px] uppercase tracking-wider font-bold truncate">Profit Shared</span>
                    <span className="font-extrabold text-blue-700 block mt-0.5 tabular-nums truncate" title={formatINR(trader.total_profit_shared)}>{formatINR(trader.total_profit_shared)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider bg-slate-50">
                <th className="py-3 px-4">Trader Name</th>
                <th className="py-3 px-4">Assigned RM</th>
                <th className="py-3 px-4">Total Profit Gained</th>
                <th className="py-3 px-4">Profit Shared</th>
                <th className="py-3 px-4">Streak Status</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {traders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No active traders registered.
                  </td>
                </tr>
              ) : (
                traders.slice(0, 5).map((trader) => (
                  <tr key={trader.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                    <td className="py-3 px-4 font-bold text-slate-800">{trader.name}</td>
                    <td className="py-3 px-4 text-slate-500">{trader.employee_name || 'RM'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{formatINR(trader.total_profit_gained)}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{formatINR(trader.total_profit_shared)}</td>
                    <td className="py-3 px-4">
                      <StreakBadge
                        streak={trader.current_streak}
                        paymentCount={getTraderPaymentCount(trader)}
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{trader.joined_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {traders.length > 5 && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate('active-traders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View all {traders.length} active traders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
