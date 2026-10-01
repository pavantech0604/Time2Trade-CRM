import React, { useState } from 'react';
import { EmployeeMonthlyPerformance } from '../../types';
import { formatINR } from '../../lib/formatters';
import {
  Trophy,
  Users,
  Search,
  Award,
  Sparkles,
  TrendingUp,
  X,
  CheckCircle2,
} from 'lucide-react';

interface EmployeePerformanceTableProps {
  performanceList: EmployeeMonthlyPerformance[];
  monthLabel: string;
  totalMonthRevenue: number;
  userRole?: string;
  currentUserId?: string;
  isLoading?: boolean;
}

export const EmployeePerformanceTable: React.FC<EmployeePerformanceTableProps> = ({
  performanceList,
  monthLabel,
  totalMonthRevenue,
  userRole = 'admin',
  currentUserId,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
        <div className="h-5 w-48 bg-slate-100 rounded" />
        <div className="h-16 bg-slate-50 rounded-2xl" />
        <div className="h-48 bg-slate-50 rounded-2xl" />
      </div>
    );
  }

  const isEmployee = userRole === 'employee';

  // Filter list by role and search
  const visibleList = performanceList.filter((emp) => {
    if (isEmployee && currentUserId && emp.employeeId !== currentUserId) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      emp.role.toLowerCase().includes(q)
    );
  });

  // Top Performer of this specific month
  const topPerformer = performanceList.find((e) => e.isTopPerformer && e.revenue > 0);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 font-sans">
      {/* ── Section Header & Enhanced Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/10">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {isEmployee ? 'My Monthly Sales Standing' : `Employee Sales Leaderboard — ${monthLabel}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {isEmployee
                ? `Your individual verified revenue credit and deal volume for ${monthLabel}`
                : `Official closed deal volume, credited revenue, and performance ranking for ${monthLabel}`}
            </p>
          </div>
        </div>

        {/* ── Executive Styled Search Bar ── */}
        {!isEmployee && performanceList.length > 1 && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80 flex items-center bg-slate-50/90 hover:bg-white focus-within:bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl shadow-xs transition-all px-3 py-1.5 group">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-2 group-focus-within:bg-blue-600 group-focus-within:text-white transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search executive by name or role..."
                className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 py-1"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0 ml-1"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded shrink-0">
                  {visibleList.length}
                </span>
              )}
            </div>

            <span className="hidden lg:inline-flex px-2.5 py-1.5 rounded-xl bg-slate-100/90 text-slate-600 border border-slate-200/70 font-mono text-[11px] font-bold shrink-0">
              {visibleList.length} of {performanceList.length} Staff
            </span>
          </div>
        )}
      </div>

      {/* ── Top Performer Spotlight Card (If available and viewing team) ── */}
      {!isEmployee && topPerformer && !searchQuery && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-yellow-500/10 border border-amber-200/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs relative overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-xl shadow-md shadow-amber-500/25 shrink-0 ring-4 ring-white">
              {topPerformer.avatarUrl ? (
                <img
                  src={topPerformer.avatarUrl}
                  alt={topPerformer.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                topPerformer.name.charAt(0)
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-mono uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  #1 Top Performer — {monthLabel}
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 mt-1">
                {topPerformer.name}
              </h4>
              <p className="text-xs text-slate-600 font-medium font-mono">
                {topPerformer.role} • Generated {topPerformer.shareOfTotalPercent}% of monthly revenue
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full sm:w-auto bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/70 font-mono text-center sm:text-right shadow-2xs relative z-10">
            <div className="px-2">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                Credited Revenue
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700 block mt-0.5">
                {formatINR(topPerformer.revenue)}
              </span>
            </div>
            <div className="px-2 border-x border-slate-100">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                Closed Deals
              </span>
              <span className="text-sm sm:text-base font-black text-slate-800 block mt-0.5">
                {topPerformer.salesCount}
              </span>
            </div>
            <div className="px-2">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                Platform Share
              </span>
              <span className="text-sm sm:text-base font-black text-amber-700 block mt-0.5">
                {topPerformer.shareOfTotalPercent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Leaderboard Table ── */}
      {visibleList.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-2 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-700">No staff records match your criteria for {monthLabel}</p>
          <p className="text-[11px] text-slate-400">
            {searchQuery ? 'Try clearing your search term to see all staff.' : 'No employee sales have been recorded for this month.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/80 font-mono">
                <th className="py-3 px-4 font-bold w-14 text-center">Rank</th>
                <th className="py-3 px-4 font-bold">Executive</th>
                <th className="py-3 px-4 font-bold text-center">Sales Count</th>
                <th className="py-3 px-4 font-bold text-right">Revenue Credited</th>
                <th className="py-3 px-4 font-bold text-center">Traders Converted</th>
                <th className="py-3 px-4 font-bold text-right">Revenue Share</th>
                <th className="py-3 px-4 font-bold text-center">Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleList.map((emp) => {
                const isWinner = emp.rank === 1 && emp.revenue > 0;
                const isCurrentUserRow = emp.employeeId === currentUserId;

                return (
                  <tr
                    key={emp.employeeId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentUserRow ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      {isWinner ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black font-mono text-xs shadow-2xs">
                          🥇
                        </span>
                      ) : emp.rank === 2 && emp.revenue > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-xs">
                          🥈
                        </span>
                      ) : emp.rank === 3 && emp.revenue > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 font-bold font-mono text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs font-semibold">
                          #{emp.rank}
                        </span>
                      )}
                    </td>

                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            emp.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {emp.name}
                            </span>
                            {isCurrentUserRow && (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[9px] font-mono font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {emp.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sales Count */}
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-800 text-sm">
                      {emp.salesCount}
                    </td>

                    {/* Revenue Credited */}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                      {formatINR(emp.revenue)}
                    </td>

                    {/* Conversions */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                      {emp.conversionsCount}
                    </td>

                    {/* Share of Total */}
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-700">
                      {emp.shareOfTotalPercent}%
                    </td>

                    {/* Standing Badge */}
                    <td className="py-3 px-4 text-center">
                      {isWinner ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold font-mono uppercase">
                          Leader
                        </span>
                      ) : emp.revenue > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-mono">
                          Pending Sales
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
