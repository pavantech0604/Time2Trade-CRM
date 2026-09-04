import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateDashboardKPIs, formatINR } from '../../lib/calculations';
import { BarChart3, TrendingUp, Users, DollarSign, Award, Target, PhoneCall } from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { leads, traders, payments, expenses, users } = useAuth();
  const kpis = calculateDashboardKPIs(leads, traders, payments, expenses);

  const conversionRate = leads.length > 0 ? ((traders.length / leads.length) * 100).toFixed(1) : '0.0';

  // Group performance metrics for all staff (Employees)
  const staffPerformance = users
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
        conversionRate: myLeads.length > 0 
          ? ((convertedLeads.length / myLeads.length) * 100).toFixed(1) 
          : '0.0',
      };
    })
    .sort((a, b) => Number(b.conversionRate) - Number(a.conversionRate)); // Sort by conversion rate for rank

  // Group performance by RM for gross revenue
  const rmPerformance = users
    .filter((u) => u.role === 'employee')
    .map((rm) => {
      const rmTraders = traders.filter((t) => t.employee_id === rm.id);
      const totalShared = rmTraders.reduce((sum, t) => sum + Number(t.total_profit_shared), 0);
      return {
        id: rm.id,
        name: rm.name,
        tradersCount: rmTraders.length,
        totalShared,
      };
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10 font-sans">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Reports & Business Analytics</h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">High-level financial scorecard, conversion funnels, and employee performance metrics</p>
      </div>

      {/* Financial Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Gross Verified Revenue</span>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">{formatINR(kpis.totalProfitShared)}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Expenses</span>
          <h3 className="text-2xl font-black text-rose-700 mt-1">{formatINR(kpis.totalExpenses)}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Net Advisory Business Profit</span>
          <h3 className="text-2xl font-black text-blue-700 mt-1">{formatINR(kpis.netProfit)}</h3>
        </div>
      </div>

      {/* Conversion Rate Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Overall Lead Conversion Efficiency</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Ratio of generated leads successfully converted into Active Traders</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-emerald-700">{conversionRate}%</span>
          <span className="text-xs text-slate-500 font-mono block mt-0.5">{traders.length} Active / {leads.length} Total Leads</span>
        </div>
      </div>

      {/* Employee & Telecaller / RM Performance intelligence */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#C5A028]" />
          <h3 className="text-sm font-bold text-slate-800">Staff Lead Conversion & Tracking Metrics</h3>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden block space-y-3">
          {staffPerformance.map((staff, idx) => (
            <div 
              key={staff.id} 
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{staff.name}</h4>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                    staff.role === 'Employee' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
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
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">Leads Added</span>
                  <span className="font-bold text-slate-700">{staff.assignedLeads}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">Leads Processed</span>
                  <span className="font-bold text-slate-700">{staff.filteredLeads}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">Clients Managed</span>
                  <span className="font-bold text-slate-700">{staff.tradersHandled}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-sans">Traders Converted</span>
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
              {staffPerformance.map((staff, idx) => (
                <tr key={staff.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{staff.name}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                      staff.role === 'Employee' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {staff.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono">{staff.assignedLeads} added</td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-mono font-semibold">{staff.filteredLeads} processed</td>
                  <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                    {staff.tradersHandled > 0 ? `${staff.tradersHandled} active` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">{staff.conversions} converted</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#C5A028]">
                    {staff.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RM Scorecard (Financial Contributions) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">RM Revenue & Portfolio Contributions</h3>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden block space-y-3">
          {rmPerformance.map((rm, idx) => (
            <div 
              key={rm.id} 
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{rm.name}</h4>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{rm.tradersCount} Active Traders</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                  Rank #{idx + 1}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="font-bold">Total Shared Profit:</span>
                <span className="font-bold text-emerald-700 font-mono">{formatINR(rm.totalShared)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3 px-4">RM Name</th>
                <th className="py-3 px-4">Managed Active Traders</th>
                <th className="py-3 px-4">Total Profit Shared via RM</th>
                <th className="py-3 px-4 text-right">Performance Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {rmPerformance.map((rm, idx) => (
                <tr key={rm.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{rm.name}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-mono font-semibold">{rm.tradersCount} Traders</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">{formatINR(rm.totalShared)}</td>
                  <td className="py-3.5 px-4 text-right">
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
    </div>
  );
};
