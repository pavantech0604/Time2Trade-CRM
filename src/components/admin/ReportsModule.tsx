import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/calculations';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Award,
  Target,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  UnifiedPeriod,
  getCurrentUnifiedPeriod,
  getPreviousReportingPeriod,
  calculatePeriodFinancials,
} from '../../lib/reportingPeriodService';
import { ReportingPeriodSelector } from '../common/ReportingPeriodSelector';

interface ReportsModuleProps {
  onNavigate?: (tab: string) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = () => {
  const { leads, traders, payments, expenses, users, managerAdvances } = useAuth();

  // Unified Reporting Period State (Defaults to Current IST Month, supports All-Time & Historical)
  const [selectedPeriod, setSelectedPeriod] = useState<UnifiedPeriod>(() => getCurrentUnifiedPeriod());

  // Period Financial Calculations
  const currentFinancials = useMemo(() => {
    return calculatePeriodFinancials({
      period: selectedPeriod,
      payments,
      expenses,
      managerAdvances,
      leads,
      traders,
    });
  }, [selectedPeriod, payments, expenses, managerAdvances, leads, traders]);

  // Previous Month Financials for MoM Analytics (when not in All-Time view)
  const previousFinancials = useMemo(() => {
    if (selectedPeriod.isAllTime) return null;
    const prevPeriod = getPreviousReportingPeriod(selectedPeriod);
    return calculatePeriodFinancials({
      period: prevPeriod,
      payments,
      expenses,
      managerAdvances,
      leads,
      traders,
    });
  }, [selectedPeriod, payments, expenses, managerAdvances, leads, traders]);

  // Month-over-Month Revenue Growth Percentage with zero-baseline safety
  const momRevenueChange = useMemo(() => {
    if (!previousFinancials || selectedPeriod.isAllTime) return null;
    const prevRev = previousFinancials.periodRevenue;
    const currRev = currentFinancials.periodRevenue;

    if (prevRev === 0) {
      if (currRev === 0) {
        return { type: 'neutral' as const, label: '0.0%', text: 'No change' };
      }
      return { type: 'neutral' as const, label: 'Fresh Month', text: 'No previous baseline' };
    }

    const pct = ((currRev - prevRev) / prevRev) * 100;
    const isPos = pct >= 0;
    return {
      type: isPos ? ('positive' as const) : ('negative' as const),
      label: `${isPos ? '+' : ''}${pct.toFixed(1)}%`,
      text: `vs ${previousFinancials.period.label} (${formatINR(prevRev)})`,
    };
  }, [currentFinancials, previousFinancials, selectedPeriod]);

  // Lead Conversion Efficiency
  const conversionRate = leads.length > 0 ? ((traders.length / leads.length) * 100).toFixed(1) : '0.0';

  // Group performance metrics for all staff (Employees) - Operational Pipeline
  const staffPerformance = useMemo(() => {
    return users
      .filter((u) => u.role === 'employee' && u.is_active)
      .map((user) => {
        const myLeads = leads.filter((l) => l.assigned_to === user.id);
        const filteredLeads = myLeads.filter((l) => l.status !== 'callback_requested');
        const convertedLeads = myLeads.filter((l) => l.status === 'active_trader');
        const myTraders = traders.filter((t) => t.employee_id === user.id);
        const totalProfit = myTraders.reduce((sum, t) => sum + (Number(t.total_profit_shared) || 0), 0);

        return {
          id: user.id,
          name: user.name,
          role: 'Employee',
          assignedLeads: myLeads.length,
          filteredLeads: filteredLeads.length,
          tradersHandled: myTraders.length,
          conversions: convertedLeads.length,
          profitGenerated: totalProfit,
          conversionRate:
            myLeads.length > 0 ? ((convertedLeads.length / myLeads.length) * 100).toFixed(1) : '0.0',
        };
      })
      .sort((a, b) => Number(b.conversionRate) - Number(a.conversionRate));
  }, [users, leads, traders]);

  // Group performance by RM for revenue (Period-Attributed & Cumulative)
  const rmPerformance = useMemo(() => {
    return users
      .filter((u) => u.role === 'employee')
      .map((rm) => {
        const rmTraders = traders.filter((t) => t.employee_id === rm.id);
        const lifetimeShared = rmTraders.reduce((sum, t) => sum + Number(t.total_profit_shared || 0), 0);

        // Period Approved Collections credited to this RM
        let periodRevenue = 0;
        currentFinancials.periodApprovedPayments.forEach((p) => {
          if (p.allocations && p.allocations.length > 0) {
            const alloc = p.allocations.find((a) => a.employee_id === rm.id);
            if (alloc) periodRevenue += Number(alloc.allocation_amount || 0);
          } else if (p.employee_id === rm.id || p.submitted_by_employee_id === rm.id) {
            periodRevenue += Number(p.amount || 0);
          }
        });

        return {
          id: rm.id,
          name: rm.name,
          tradersCount: rmTraders.length,
          periodRevenue,
          lifetimeShared,
        };
      })
      .sort((a, b) => {
        if (selectedPeriod.isAllTime) {
          return b.lifetimeShared - a.lifetimeShared;
        }
        return b.periodRevenue - a.periodRevenue;
      });
  }, [users, traders, currentFinancials, selectedPeriod]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10 font-sans">
      {/* Header with Title and Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Reports & Business Analytics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#091A2F]/5 text-[#091A2F] border border-slate-200">
              {selectedPeriod.isAllTime ? 'All-Time Scope' : selectedPeriod.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Cross-module financial reconciliation, conversion metrics, and period-specific RM performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ReportingPeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            includeAllTime={true}
          />
        </div>
      </div>

      {/* Financial Scorecard Grid (Unified Period Isolation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Verified Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                {selectedPeriod.isAllTime ? 'Gross Revenue (All Time)' : 'Gross Verified Revenue'}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-emerald-700 mt-1.5 font-mono">
              {formatINR(currentFinancials.periodRevenue)}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {selectedPeriod.isAllTime ? (
              <span className="text-slate-400 font-mono">
                {currentFinancials.periodApprovedCount} total collections
              </span>
            ) : momRevenueChange ? (
              <div className="flex items-center gap-1 font-medium">
                {momRevenueChange.type === 'positive' && (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {momRevenueChange.type === 'negative' && (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span
                  className={
                    momRevenueChange.type === 'positive'
                      ? 'text-emerald-700 font-bold'
                      : momRevenueChange.type === 'negative'
                      ? 'text-rose-700 font-bold'
                      : 'text-slate-500 font-semibold'
                  }
                >
                  {momRevenueChange.label}
                </span>
                <span className="text-slate-400 text-[10px] truncate max-w-[110px]" title={momRevenueChange.text}>
                  {momRevenueChange.text}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 font-mono">{currentFinancials.periodApprovedCount} period deals</span>
            )}
          </div>
        </div>

        {/* Total Operational Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                {selectedPeriod.isAllTime ? 'Total Expenses (All Time)' : 'Period Expenses'}
              </span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-2xl font-black text-rose-700 mt-1.5 font-mono">
              {formatINR(currentFinancials.periodExpensesTotal)}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            {currentFinancials.periodOperationalExpenses.length} verified vouchers
          </div>
        </div>

        {/* Company Share (40%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                Company Gross (40%)
              </span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-blue-700 mt-1.5 font-mono">
              {formatINR(currentFinancials.periodCompanyGrossShare)}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Base advisory allocation
          </div>
        </div>

        {/* Manager Share (60%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                Manager Share (60%)
              </span>
              <Award className="w-4 h-4 text-[#C5A028]" />
            </div>
            <h3 className="text-2xl font-black text-[#C5A028] mt-1.5 font-mono">
              {formatINR(currentFinancials.periodManagerShare)}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Advances deducted: {formatINR(currentFinancials.periodAdvancesTotal)}
          </div>
        </div>

        {/* Net Advisory Business Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between bg-gradient-to-br from-white to-slate-50">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                Net Advisory Profit
              </span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <h3
              className={`text-2xl font-black mt-1.5 font-mono ${
                currentFinancials.periodNetCompanyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatINR(currentFinancials.periodNetCompanyProfit)}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            40% Gross less Expenses
          </div>
        </div>
      </div>

      {/* Historical Context Bar (Visible when single period is selected) */}
      {!selectedPeriod.isAllTime && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700 font-sans">
              Cumulative Platform Reference (Lifetime Total):
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Collections:{' '}
              <strong className="text-slate-900 font-bold">
                {formatINR(currentFinancials.lifetimeRevenue)}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Expenses:{' '}
              <strong className="text-rose-700 font-bold">
                {formatINR(currentFinancials.lifetimeExpensesTotal)}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Net Advisory Profit:{' '}
              <strong className="text-emerald-700 font-bold">
                {formatINR(currentFinancials.lifetimeNetCompanyProfit)}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Manager Balance Due:{' '}
              <strong className="text-amber-700 font-bold">
                {formatINR(currentFinancials.lifetimeBalanceDue)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Conversion Rate Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Overall Lead Conversion Efficiency</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Ratio of generated leads successfully converted into Active Traders
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-black text-emerald-700">{conversionRate}%</span>
          <span className="text-xs text-slate-500 font-mono block mt-0.5">
            {traders.length} Active / {leads.length} Total Leads
          </span>
        </div>
      </div>

      {/* RM Revenue & Portfolio Contributions (Period-Aware) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              RM Revenue & Portfolio Contributions{' '}
              <span className="text-xs font-normal text-slate-500">
                ({selectedPeriod.isAllTime ? 'All-Time' : selectedPeriod.label})
              </span>
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {selectedPeriod.isAllTime ? 'Ranked by Total Shared' : 'Ranked by Period Approved Revenue'}
          </span>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden block space-y-3">
          {rmPerformance.map((rm, idx) => (
            <div
              key={rm.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{rm.name}</h4>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                    {rm.tradersCount} Active Traders Managed
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                  Rank #{idx + 1}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-100 font-mono">
                <div>
                  <span className="text-slate-400 uppercase text-[9px] block">
                    {selectedPeriod.isAllTime ? 'All-Time Collections' : 'Period Collections'}
                  </span>
                  <span className="font-bold text-emerald-700">
                    {formatINR(selectedPeriod.isAllTime ? rm.lifetimeShared : rm.periodRevenue)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase text-[9px] block">Lifetime Trader Profit</span>
                  <span className="font-semibold text-slate-700">{formatINR(rm.lifetimeShared)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5 font-mono">
                <th className="py-3 px-4">RM Name</th>
                <th className="py-3 px-4 text-center">Managed Active Traders</th>
                <th className="py-3 px-4 text-right">
                  {selectedPeriod.isAllTime ? 'All-Time Revenue' : `${selectedPeriod.label} Collections`}
                </th>
                <th className="py-3 px-4 text-right">Lifetime Trader Profit</th>
                <th className="py-3 px-4 text-center">Performance Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {rmPerformance.map((rm, idx) => (
                <tr key={rm.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{rm.name}</td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-mono font-semibold">
                    {rm.tradersCount} Traders
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                    {formatINR(selectedPeriod.isAllTime ? rm.lifetimeShared : rm.periodRevenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                    {formatINR(rm.lifetimeShared)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                      Rank #{idx + 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Lead Conversion & Tracking Metrics */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#C5A028]" />
          <h3 className="text-sm font-bold text-slate-800">Staff Lead Conversion & Tracking Metrics</h3>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden block space-y-3">
          {staffPerformance.map((staff) => (
            <div
              key={staff.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{staff.name}</h4>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                      staff.role === 'Employee'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {staff.role}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase block font-mono">Conversion Rate</span>
                  <span className="text-xs font-black text-[#C5A028] font-mono">{staff.conversionRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">
                    Leads Added
                  </span>
                  <span className="font-bold text-slate-700">{staff.assignedLeads}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">
                    Leads Processed
                  </span>
                  <span className="font-bold text-slate-700">{staff.filteredLeads}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">
                    Clients Managed
                  </span>
                  <span className="font-bold text-slate-700">{staff.tradersHandled}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">
                    Traders Converted
                  </span>
                  <span className="font-bold text-emerald-700">{staff.conversions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5 font-mono">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Leads Added</th>
                <th className="py-3 px-4 text-center">Leads Processed</th>
                <th className="py-3 px-4 text-center">Clients Managed</th>
                <th className="py-3 px-4 text-center">Traders Converted</th>
                <th className="py-3 px-4 text-right">Success Rate (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {staffPerformance.map((staff) => (
                <tr
                  key={staff.id}
                  className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-800">{staff.name}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        staff.role === 'Employee'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {staff.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                    {staff.assignedLeads} added
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-mono font-semibold">
                    {staff.filteredLeads} processed
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                    {staff.tradersHandled > 0 ? `${staff.tradersHandled} active` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">
                    {staff.conversions} converted
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#C5A028]">
                    {staff.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
