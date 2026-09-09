import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/formatters';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Search,
  ZoomIn,
  X,
  FileSpreadsheet,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const EmployeeSalesDashboard: React.FC = () => {
  const { payments: contextPayments, users } = useAuth();
  const payments = contextPayments;

  
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Equity' | 'Commodity'>('all');

  // Filter only approved payments
  const approvedPayments = useMemo(() => {
    return payments.filter(p => p.status === 'approved');
  }, [payments]);

  // High-level payment statistics for Admin
  const adminKPIs = useMemo(() => {
    const totalPaymentsCount = payments.length;
    const pendingCount = payments.filter((p) => p.status === 'pending_verification').length;
    const approvedCount = approvedPayments.length;
    const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

    const totalPaymentAmount = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const sharedPaymentCount = approvedPayments.filter((p) => p.is_shared || (p.allocations && p.allocations.length > 1)).length;

    // Breakdown by Service Category
    const equitySales = approvedPayments
      .filter((p) => p.service_category === 'Equity')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const commoditySales = approvedPayments
      .filter((p) => p.service_category === 'Commodity')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Breakdown by Duration
    const durationSales = {
      '3 Months': approvedPayments
        .filter((p) => p.subscription_duration === '3 Months')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      '6 Months': approvedPayments
        .filter((p) => p.subscription_duration === '6 Months')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      'Yearly': approvedPayments
        .filter((p) => p.subscription_duration === 'Yearly')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    };

    return {
      totalPaymentsCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalPaymentAmount,
      sharedPaymentCount,
      equitySales,
      commoditySales,
      durationSales,
    };
  }, [payments, approvedPayments]);

  // Calculate statistics per employee based on individual allocations
  const employeeStats = useMemo(() => {
    const stats: Record<string, {
      id: string;
      name: string;
      role: string;
      daily: number;
      weekly: number;
      monthly: number;
      total: number;
      payments: Array<{
        payment: typeof approvedPayments[0];
        creditedAmount: number;
        allocationPercentage: number;
        isShared: boolean;
      }>;
    }> = {};

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Initialize stats for staff
    users.forEach(user => {
      if (['employee', 'admin'].includes(user.role)) {
        stats[user.id] = {
          id: user.id,
          name: user.name,
          role: user.role === 'employee' ? 'Employee' : 'Admin',
          daily: 0,
          weekly: 0,
          monthly: 0,
          total: 0,
          payments: []
        };
      }
    });

    // Also handle 'Direct / Head Office' payments
    stats['direct'] = {
      id: 'direct',
      name: 'Direct / Head Office',
      role: 'System',
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
      payments: []
    };

    approvedPayments.forEach(payment => {
      const txDate = new Date(payment.transaction_time);
      const txDateStr = payment.transaction_time.split('T')[0];

      if (payment.allocations && payment.allocations.length > 0) {
        // Multi-employee allocation distribution
        payment.allocations.forEach(alloc => {
          const empId = alloc.employee_id || 'direct';
          if (!stats[empId]) {
            stats[empId] = {
              id: empId,
              name: alloc.employee_name || 'Staff',
              role: alloc.employee_role || 'Employee',
              daily: 0,
              weekly: 0,
              monthly: 0,
              total: 0,
              payments: [],
            };
          }

          const credited = Number(alloc.allocation_amount) || 0;
          stats[empId].total += credited;

          stats[empId].payments.push({
            payment,
            creditedAmount: credited,
            allocationPercentage: alloc.allocation_percentage || 100,
            isShared: payment.allocations!.length > 1,
          });

          if (txDateStr === todayStr) stats[empId].daily += credited;
          if (txDate >= startOfWeek) stats[empId].weekly += credited;
          if (txDate >= startOfMonth) stats[empId].monthly += credited;
        });
      } else {
        // Single employee / Direct payment
        const empId = payment.employee_id || 'direct';
        if (!stats[empId]) {
          stats[empId] = {
            id: empId,
            name: payment.employee_name || 'Unknown',
            role: 'Unknown',
            daily: 0,
            weekly: 0,
            monthly: 0,
            total: 0,
            payments: [],
          };
        }

        const credited = Number(payment.amount) || 0;
        stats[empId].total += credited;

        stats[empId].payments.push({
          payment,
          creditedAmount: credited,
          allocationPercentage: 100,
          isShared: false,
        });

        if (txDateStr === todayStr) stats[empId].daily += credited;
        if (txDate >= startOfWeek) stats[empId].weekly += credited;
        if (txDate >= startOfMonth) stats[empId].monthly += credited;
      }
    });

    // Sort payments within each employee by newest first
    Object.values(stats).forEach(stat => {
      stat.payments.sort(
        (a, b) => new Date(b.payment.transaction_time).getTime() - new Date(a.payment.transaction_time).getTime()
      );
    });

    return Object.values(stats)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [approvedPayments, users]);

  const toggleCard = (id: string) => {
    setExpandedCardId(prev => prev === id ? null : id);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#C5A028]" />
            Performance & Verified Sales
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Inspect verified employee sales ledgers, shared payment allocations, and service distributions
          </p>
        </div>
      </div>

      {/* Top Admin KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Approved Sales</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-1">
            {formatINR(adminKPIs.totalPaymentAmount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            {adminKPIs.approvedCount} verified transactions
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Awaiting Verification</span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 block mt-1">
            {adminKPIs.pendingCount} Payments
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            Requires admin approval
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shared Payments</span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 block mt-1">
            {adminKPIs.sharedPaymentCount} Shared
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            Multi-employee sales splits
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category Distribution</span>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
            <span className="text-blue-700">Equity: {formatINR(adminKPIs.equitySales)}</span>
            <span className="text-amber-700">MCX: {formatINR(adminKPIs.commoditySales)}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">
            3M: {formatINR(adminKPIs.durationSales['3 Months'])} • 6M: {formatINR(adminKPIs.durationSales['6 Months'])} • 1Y: {formatINR(adminKPIs.durationSales['Yearly'])}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {employeeStats.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <p className="text-slate-500 font-semibold">No verified sales data found.</p>
          </div>
        ) : (
          employeeStats.map(stat => {
            const isExpanded = expandedCardId === stat.id;
            
            // Filter payments for this specific expanded card if search query exists
            const filteredCardPayments = stat.payments.filter(({ payment }) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                payment.trader_name?.toLowerCase().includes(q) ||
                payment.utr.toLowerCase().includes(q) ||
                payment.payment_mode.toLowerCase().includes(q) ||
                (payment.service_category && payment.service_category.toLowerCase().includes(q))
              );
            });

            return (
              <div 
                key={stat.id} 
                className={`relative rounded-3xl transition-all duration-500 group ${
                  isExpanded ? 'z-20' : 'hover:z-10 z-0'
                }`}
              >
                {/* Animated Gradient Border Glow */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-[#C5A028] to-emerald-500 transition-all duration-700 blur-md ${
                  isExpanded ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'
                }`}></div>
                
                {/* Solid Gradient Border base */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-700 ${
                  isExpanded ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'
                }`}></div>

                {/* Inner Card Container */}
                <div className="relative z-10 flex flex-col bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl overflow-hidden transition-all duration-500">
                  
                  {/* Subtle ambient background blob */}
                  <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-100 to-emerald-50 rounded-full blur-[60px] opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"></div>

                  {/* Card Header & High-Level Stats (Always Visible) */}
                  <div 
                    onClick={() => toggleCard(stat.id)}
                    className="relative p-4 sm:p-6 md:p-8 cursor-pointer flex flex-col xl:flex-row xl:items-center justify-between gap-6 sm:gap-8 z-10"
                  >
                    {/* Profile Section */}
                    <div className="flex items-center gap-4 sm:gap-5 xl:w-1/4 shrink-0 group/profile">
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden transition-transform duration-500 group-hover/profile:scale-105 group-hover/profile:rotate-3 group-hover/profile:shadow-blue-500/20">
                          <UserIcon className="w-5 h-5 sm:w-7 sm:h-7 opacity-90 transition-transform duration-500 group-hover/profile:scale-110" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-white rounded-full p-1 shadow-sm">
                          <span className="flex w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white items-center justify-center animate-pulse">
                             <span className="sr-only">Active</span>
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight group-hover/profile:text-blue-700 transition-colors">{stat.name}</h3>
                        <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-slate-100/80 text-slate-600 border border-slate-200/50 backdrop-blur-sm">
                          {stat.role}
                        </span>
                      </div>
                    </div>

                    {/* Big Number Stats Section */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 border-t border-slate-100/50 xl:border-t-0 pt-4 sm:pt-6 xl:pt-0">
                      <div className="space-y-1.5 sm:space-y-2 group/stat">
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover/stat:text-blue-500 transition-colors" /> Today's Verified
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-baseline gap-1 group-hover/stat:text-blue-700 transition-colors">
                          {formatINR(stat.daily)}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2 group/stat">
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover/stat:text-indigo-500 transition-colors" /> This Week's Sales
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-baseline gap-1 group-hover/stat:text-indigo-700 transition-colors">
                          {formatINR(stat.weekly)}
                        </div>
                      </div>
                    </div>

                    {/* Total All-Time & Action CTA */}
                    <div className="flex items-center justify-between xl:justify-end gap-6 sm:gap-8 border-t border-slate-100/50 xl:border-t-0 pt-4 sm:pt-6 xl:pt-0">
                      <div className="text-left xl:text-right space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Credited Sales</span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                          {formatINR(stat.total)}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 xl:w-12 xl:h-12 rounded-xl xl:rounded-2xl bg-slate-50 xl:bg-white/50 border border-slate-100 shadow-xs text-slate-400 shrink-0 backdrop-blur-sm group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Area: Spreadsheet Data */}
                  <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="border-t border-slate-100/50 bg-slate-50/50 backdrop-blur-md">
                        <div className="p-4 md:px-8 border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-bold text-slate-800">Verified Submissions Ledger</h4>
                            <span className="text-[11px] font-black bg-blue-100/80 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200/50">
                              {stat.payments.length} Records
                            </span>
                          </div>
                          
                          <div className="relative w-full md:w-72 group/search">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within/search:text-blue-500 transition-colors" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search UTR, Client, Mode..."
                              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto p-4 md:px-8 pb-8">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                              <tr className="border-b-2 border-slate-200/60 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                <th className="py-4 px-4 pl-0">Date & Time</th>
                                <th className="py-4 px-4">Client / Trader</th>
                                <th className="py-4 px-4">Service Package</th>
                                <th className="py-4 px-4 text-right">Credited Share</th>
                                <th className="py-4 px-4">Mode & Sharing</th>
                                <th className="py-4 px-4">Bank Ref (UTR)</th>
                                <th className="py-4 px-4 text-right pr-0">Visual Proof</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                              {filteredCardPayments.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-sm">
                                    No records match your search for this employee.
                                  </td>
                                </tr>
                              ) : (
                                filteredCardPayments.map(({ payment, creditedAmount, allocationPercentage, isShared }) => (
                                  <tr key={payment.id} className="hover:bg-white/60 transition-colors group/row">
                                    <td className="py-4 px-4 pl-0 font-mono text-slate-500 text-[11px]">
                                      {new Date(payment.transaction_time).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </td>
                                    <td className="py-4 px-4">
                                      <span className="font-bold text-slate-800 text-sm block">{payment.trader_name}</span>
                                      {payment.trader_phone && (
                                        <span className="text-[10px] text-slate-400 font-mono">{payment.trader_phone}</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4">
                                      {payment.service_category ? (
                                        <div>
                                          <span className="font-bold text-slate-800 block">
                                            {payment.service_category} • {payment.service_type}
                                          </span>
                                          <span className="text-[10px] font-semibold text-teal-600">
                                            {payment.subscription_duration}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">Standard</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                      <span className="font-black text-emerald-700 text-sm block">
                                        {formatINR(creditedAmount)}
                                      </span>
                                      {isShared && (
                                        <span className="text-[10px] text-slate-400 block">
                                          {allocationPercentage}% of {formatINR(payment.amount)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4">
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-semibold text-[11px] border border-slate-200/50">
                                        {payment.payment_mode}
                                      </span>
                                      {isShared && (
                                        <span className="block text-[9px] font-bold text-blue-700 mt-0.5">
                                          Shared Sale ({payment.allocations?.length} staff)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 font-mono font-bold text-slate-700 group-hover/row:text-blue-600 transition-colors">
                                      {payment.utr}
                                    </td>
                                    <td className="py-4 px-4 pr-0">
                                      <div className="flex items-center justify-end">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage(payment.screenshot_url);
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold transition-all shadow-sm hover:shadow active:scale-95"
                                        >
                                          <ZoomIn className="w-4 h-4" /> 
                                          <span>Verify</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Screen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-14 right-0 text-white hover:text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 font-bold cursor-pointer transition-colors bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20"
            >
              <X className="w-5 h-5" /> Close Inspection
            </button>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-2 shadow-2xl w-full flex justify-center items-center overflow-hidden h-[80vh]">
              <img 
                src={previewImage} 
                alt="Full size proof" 
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
