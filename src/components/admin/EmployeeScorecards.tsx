import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lead } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Search, Camera, CheckCircle2, TrendingUp, Target } from 'lucide-react';

export const EmployeeScorecards: React.FC = () => {
  const { leads, users } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Table ONLY displays leads successfully converted to active traders
  const filteredLeads = leads.filter((l) => {
    if (l.status !== 'active_trader') return false;
    
    if (selectedEmployeeId && l.assigned_to !== selectedEmployeeId) return false;

    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      (l.source && l.source.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Calculate detailed performance scorecard metrics for ALL active employees
  const staffMetrics = users
    .filter((u) => (u.role === 'employee') && u.is_active)
    .map((user) => {
      const handledLeads = leads.filter((l) => l.assigned_to === user.id);

      // Filtered count (leads called/actioned from fresh state)
      const filteredCount = handledLeads.length;

      // Conversions count (leads successfully converted to active traders)
      const conversionsCount = handledLeads.filter((l) => l.status === 'active_trader').length;


      return {
        id: user.id,
        name: user.name,
        role: 'Employee',
        handled: handledLeads.length,
        filtered: filteredCount,
        conversions: conversionsCount,
        conversionRate: handledLeads.length > 0 
          ? ((conversionsCount / handledLeads.length) * 100).toFixed(1) 
          : '0.0',
      };
    });

  return (
    <div className="space-y-6 font-sans pb-10 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          Converted Traders Registry
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Master directory of leads converted to active trading accounts. View conversion stats and employee scorecards.
        </p>
      </div>

      {/* Staff Productivity & Performance List Rows (Light Theme) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#C5A028]" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">
            Employee Performance & Conversion Scorecards
          </h3>
        </div>
        
        <div className="flex flex-col gap-3">
          {staffMetrics.map((metric) => {
            const completionRate = metric.handled > 0
              ? ((metric.filtered / metric.handled) * 100).toFixed(1)
              : '0.0';
            return (
              <div 
                key={metric.id} 
                onClick={() => setSelectedEmployeeId(selectedEmployeeId === metric.id ? null : metric.id)}
                className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  selectedEmployeeId === metric.id 
                    ? 'bg-blue-50/50 border-blue-400 shadow-md ring-2 ring-blue-500/20' 
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[#C5A028]/30'
                }`}
              >
                {/* Employee Info */}
                <div className="flex items-center gap-4 min-w-0 lg:min-w-[240px] w-full lg:w-auto">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-800 text-sm shrink-0">
                    {metric.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">{metric.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        metric.role === 'Employee' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {metric.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Counts */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-6 w-full lg:w-auto text-center lg:text-left bg-slate-50 lg:bg-transparent p-3.5 lg:p-0 rounded-2xl border border-slate-200 lg:border-none">
                  <div className="min-w-[60px]">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Handled</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">{metric.handled}</span>
                  </div>
                  <div className="min-w-[60px]">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Filtered</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">{metric.filtered}</span>
                  </div>
                  <div className="min-w-[60px]">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Traders</span>
                    <span className="text-sm font-black text-emerald-600 mt-0.5 block">{metric.conversions}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full lg:flex-1 lg:max-w-xs space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono font-medium">
                    <span>Call Filter completion:</span>
                    <span className="font-bold text-slate-700">{metric.filtered} / {metric.handled}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#C5A028] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Number(completionRate))}%` }}
                    />
                  </div>
                </div>

                {/* Success Conversion Rate Box */}
                <div className="flex items-center justify-between gap-3 bg-[#C5A028]/10 px-4 py-2.5 rounded-2xl border border-[#C5A028]/20 min-w-0 lg:min-w-[130px] w-full lg:w-auto">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block uppercase leading-none mb-0.5">Conv. Rate</span>
                    <span className="text-sm font-black text-slate-800 font-mono">{metric.conversionRate}%</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#C5A028] animate-pulse shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar (Light Theme) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active traders by name, phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedEmployeeId && (
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
            >
              Clear Filter
            </button>
          )}
          <div className="text-xs font-mono font-bold text-[#C5A028] bg-[#C5A028]/10 px-3.5 py-1.5 rounded-full border border-[#C5A028]/20 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C5A028]" />
            <span>Showing {filteredLeads.length} Converted Traders</span>
          </div>
        </div>
      </div>

      {/* Leads Table Card (Light Theme) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Mobile View: Cards Layout (Purely Read-only) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No active traders found.</div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-4 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{lead.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lead.phone}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100">
                    Active Trader
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                  <div>
                    <span className="text-slate-400">Source:</span> {lead.source}
                  </div>
                  <div>
                    <span className="text-slate-400">Added By:</span> {lead.assigned_to_name || 'Unassigned'}
                  </div>
                  
                  <div>
                    <span className="text-slate-400">Added Date:</span> {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Read-only Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-3.5 px-4">Trader Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Lead Source</th>
                <th className="py-3.5 px-4">Assigned Employee</th>
                <th className="py-3.5 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No converted active traders found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-all font-sans text-slate-700">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{lead.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{lead.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border bg-slate-100 text-slate-500 border-slate-200">
                        {lead.source === 'manual' ? 'Manual Entry' : lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{lead.assigned_to_name || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
