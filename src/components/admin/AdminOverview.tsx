import React from 'react';
import {
  Users,
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../common/MetricCard';
import { StatusBadge } from '../common/StatusBadge';
import { StreakBadge } from '../common/StreakBadge';
import { calculateDashboardKPIs, formatINR } from '../../lib/calculations';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const { leads, traders, payments, expenses } = useAuth();

  const kpis = calculateDashboardKPIs(leads, traders, payments, expenses);

  const pendingVerificationList = payments.filter((p) => p.status === 'pending_verification');
  const pendingHandoffsList = leads.filter((l) => l.status === 'interested_rm_required');

  // Chart data for daily approved payments
  const chartData = [
    { date: 'Aug 13', amount: 45000 },
    { date: 'Aug 14', amount: 82000 },
    { date: 'Aug 15', amount: 65000 },
    { date: 'Aug 16', amount: 110000 },
    { date: 'Aug 17', amount: 95000 },
    { date: 'Aug 18', amount: 69000 },
    { date: 'Aug 19', amount: 164000 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time advisory metrics, active trader streaks, and profit-sharing verification
          </p>
        </div>
      </div>

      {/* 4 Primary Top KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Advisory Leads"
          value={kpis.totalLeads}
          isCurrency={false}
          change={14.2}
          changeLabel="vs last week"
          icon={Users}
          variant="info"
          onClick={() => onNavigate('leads-management')}
        />

        <MetricCard
          title="Active Traders"
          value={kpis.activeTraders}
          isCurrency={false}
          change={8.5}
          changeLabel="high streak"
          icon={TrendingUp}
          variant="positive"
          onClick={() => onNavigate('active-traders')}
        />

        <MetricCard
          title="Total Profit Shared"
          value={kpis.totalProfitShared}
          change={22.4}
          changeLabel="this month"
          icon={CreditCard}
          variant="positive"
        />

        <MetricCard
          title="Net Business Profit"
          value={kpis.netProfit}
          change={18.1}
          changeLabel="after expenses"
          icon={DollarSign}
          variant="positive"
        />
      </div>

      {/* Operational Alerts Banner */}
      {(kpis.pendingHandoffsCount > 0 || kpis.pendingVerificationCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.pendingVerificationCount > 0 && (
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
          )}

          {kpis.pendingHandoffsCount > 0 && (
            <div
              onClick={() => onNavigate('leads-management')}
              className="bg-purple-550/5 border border-purple-200 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-purple-550/10 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-900">
                    {kpis.pendingHandoffsCount} Leads Pending RM Handoff
                  </h4>
                  <p className="text-[11px] text-purple-700/80 mt-0.5 font-medium">Telecallers marked interested — RM call required</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-purple-750" />
            </div>
          )}
        </div>
      )}

      {/* Main Chart + Lead Funnel Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Profit Shared Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daily Approved Profit Collections</h3>
              <p className="text-xs text-slate-500 font-medium">30-day verified bank collection trend</p>
            </div>
          </div>
          <div className="h-64 w-full">
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Lead Stage Distribution</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Advisory onboarding pipeline breakdown</p>

            <div className="space-y-3">
              {[
                { stage: 'New Leads', count: leads.filter((l) => l.status === 'new').length, color: 'bg-blue-500' },
                { stage: 'Called', count: leads.filter((l) => l.status === 'called').length, color: 'bg-cyan-500' },
                { stage: 'RM Required', count: leads.filter((l) => l.status === 'interested_rm_required').length, color: 'bg-purple-500' },
                { stage: 'RM Contacted', count: leads.filter((l) => l.status === 'rm_contacted').length, color: 'bg-indigo-500' },
                { stage: 'Active Trader', count: leads.filter((l) => l.status === 'active_trader').length, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-655">{item.stage}</span>
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Top Performing Active Traders</h3>
          <button
            onClick={() => onNavigate('active-traders')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-750 flex items-center gap-1 cursor-pointer transition-colors"
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
                    <span className="text-[10px] text-slate-450 block font-mono mt-0.5">RM: {trader.rm_assigned_to_name || 'RM'}</span>
                  </div>
                  <StreakBadge streak={trader.current_streak} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-655 bg-slate-50 p-2.5 rounded-2xl border border-slate-150">
                  <div>
                    <span className="text-slate-450 block text-[8px] uppercase tracking-wider font-bold">Profit Gained</span>
                    <span className="font-extrabold text-emerald-700 block mt-0.5">{formatINR(trader.total_profit_gained)}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block text-[8px] uppercase tracking-wider font-bold">Profit Shared</span>
                    <span className="font-extrabold text-blue-700 block mt-0.5">{formatINR(trader.total_profit_shared)}</span>
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
              <tr className="border-b border-slate-150 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3 px-4">Trader Name</th>
                <th className="py-3 px-4">Assigned RM</th>
                <th className="py-3 px-4">Total Profit Gained</th>
                <th className="py-3 px-4">Profit Shared</th>
                <th className="py-3 px-4">Streak Status</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {traders.map((trader) => (
                <tr key={trader.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3 px-4 font-bold text-slate-800">{trader.name}</td>
                  <td className="py-3 px-4 text-slate-550">{trader.rm_assigned_to_name || 'RM'}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{formatINR(trader.total_profit_gained)}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{formatINR(trader.total_profit_shared)}</td>
                  <td className="py-3 px-4">
                    <StreakBadge streak={trader.current_streak} />
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{trader.joined_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
