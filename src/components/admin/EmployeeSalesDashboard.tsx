import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/calculations';
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
import { INITIAL_PAYMENTS } from '../../lib/mockData';

export const EmployeeSalesDashboard: React.FC = () => {
  const { payments: contextPayments, users } = useAuth();
  
  // Use context payments if available, otherwise fallback to mock data for demo purposes
  const payments = contextPayments.length > 0 ? contextPayments : INITIAL_PAYMENTS;

  
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter only approved payments
  const approvedPayments = useMemo(() => {
    return payments.filter(p => p.status === 'approved');
  }, [payments]);

  // Calculate statistics per employee
  const employeeStats = useMemo(() => {
    const stats: Record<string, {
      id: string;
      name: string;
      role: string;
      daily: number;
      weekly: number;
      monthly: number;
      total: number;
      payments: typeof approvedPayments;
    }> = {};

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Initialize stats for users who have at least one approved payment or are active employees
    users.forEach(user => {
      if (['telecaller', 'relationship_manager', 'admin'].includes(user.role)) {
        stats[user.id] = {
          id: user.id,
          name: user.name,
          role: user.role === 'relationship_manager' ? 'RM' : user.role === 'admin' ? 'Admin' : 'Telecaller',
          daily: 0,
          weekly: 0,
          monthly: 0,
          total: 0,
          payments: []
        };
      }
    });

    // Also handle 'Direct / Head Office' payments that have no employee_id
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
          payments: []
        };
      }

      const amount = Number(payment.amount);
      const txDate = new Date(payment.transaction_time);
      const txDateStr = payment.transaction_time.split('T')[0];

      stats[empId].total += amount;
      stats[empId].payments.push(payment);

      if (txDateStr === todayStr) {
        stats[empId].daily += amount;
      }
      if (txDate >= startOfWeek) {
        stats[empId].weekly += amount;
      }
      if (txDate >= startOfMonth) {
        stats[empId].monthly += amount;
      }
    });

    // Sort payments within each employee by newest first
    Object.values(stats).forEach(stat => {
      stat.payments.sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());
    });

    // Filter out those with 0 total sales if they are just inactive roles, keep those with data
    return Object.values(stats)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
      
  }, [approvedPayments, users]);

  const toggleCard = (id: string) => {
    setExpandedCardId(prev => prev === id ? null : id);
    setSearchQuery(''); // Reset search when switching cards
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#C5A028]" />
            Performance & Verified Sales
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Click on any employee card to inspect their verified payment ledger
          </p>
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
            const filteredCardPayments = stat.payments.filter(p => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                p.trader_name?.toLowerCase().includes(q) ||
                p.utr.toLowerCase().includes(q) ||
                p.payment_mode.toLowerCase().includes(q)
              );
            });

            return (
              <div 
                key={stat.id} 
                className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ${
                  isExpanded 
                    ? 'ring-2 ring-blue-500/30 shadow-2xl border-transparent' 
                    : 'border border-slate-200 shadow-md hover:shadow-lg hover:border-slate-300'
                }`}
              >
                {/* Card Header & High-Level Stats (Always Visible) */}
                <div 
                  onClick={() => toggleCard(stat.id)}
                  className={`p-6 md:p-8 cursor-pointer flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors ${
                    isExpanded ? 'bg-gradient-to-b from-blue-50/50 to-white' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {/* Profile Section */}
                  <div className="flex items-center gap-5 xl:w-1/4 shrink-0">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg overflow-hidden">
                        <UserIcon className="w-8 h-8 opacity-80" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                        <span className="flex w-5 h-5 bg-emerald-500 rounded-full border-2 border-white items-center justify-center">
                           <span className="sr-only">Active</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.name}</h3>
                      <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                        {stat.role}
                      </span>
                    </div>
                  </div>

                  {/* Big Number Stats Section */}
                  <div className="flex-1 grid grid-cols-2 gap-4 md:gap-8 border-t border-slate-100 xl:border-t-0 pt-6 xl:pt-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">
                        <Calendar className="w-4 h-4" /> Today
                      </div>
                      <div className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                        {formatINR(stat.daily).replace('.00', '')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                        <CalendarRange className="w-4 h-4" /> This Month
                      </div>
                      <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 tracking-tighter drop-shadow-sm">
                        {formatINR(stat.monthly).replace('.00', '')}
                      </div>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="hidden xl:flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 shrink-0">
                    <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                  </div>
                </div>

                {/* Expanded Area: Spreadsheet Data */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white animate-in slide-in-from-top-4 duration-300">
                    <div className="p-4 md:px-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-slate-800">Verified Submissions Ledger</h4>
                        <span className="text-[11px] font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                          {stat.payments.length} Records
                        </span>
                      </div>
                      
                      <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search UTR, Client, Mode..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto p-4 md:px-8 pb-8">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <th className="py-4 px-4 pl-0">Date & Time</th>
                            <th className="py-4 px-4">Client / Trader</th>
                            <th className="py-4 px-4 text-right">Verified Amount</th>
                            <th className="py-4 px-4">Payment Mode</th>
                            <th className="py-4 px-4">Bank Ref (UTR)</th>
                            <th className="py-4 px-4 text-right pr-0">Visual Proof</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCardPayments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-sm">
                                No records match your search for this employee.
                              </td>
                            </tr>
                          ) : (
                            filteredCardPayments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-blue-50/40 transition-colors group">
                                <td className="py-4 px-4 pl-0 font-mono text-slate-500 text-[11px]">
                                  {new Date(payment.transaction_time).toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-4 px-4 font-bold text-slate-800 text-sm">
                                  {payment.trader_name}
                                </td>
                                <td className="py-4 px-4 font-black text-emerald-600 text-right text-sm">
                                  {formatINR(payment.amount)}
                                </td>
                                <td className="py-4 px-4">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                    {payment.payment_mode}
                                  </span>
                                </td>
                                <td className="py-4 px-4 font-mono font-bold text-slate-700">
                                  {payment.utr}
                                </td>
                                <td className="py-4 px-4 pr-0">
                                  <div className="flex items-center justify-end">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage(payment.screenshot_url);
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-blue-600 font-bold transition-all group-hover:shadow-sm"
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
                )}
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
