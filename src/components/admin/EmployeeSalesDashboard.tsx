import React, { useState, useMemo } from 'react';
import { useAuth, isBhavaniUser } from '../../context/AuthContext';
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
  User as UserIcon,
  Copy,
  Check,
  Building2,
  Droplet,
  Eye,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import {
  UnifiedPeriod,
  getCurrentUnifiedPeriod,
  getAvailableReportingPeriods,
  toUnifiedPeriod,
  isDateInReportingPeriod,
  getISTDateParts,
} from '../../lib/reportingPeriodService';
import { ReportingPeriodSelector } from '../common/ReportingPeriodSelector';
import { ProfileModal } from '../layout/ProfileModal';
import { User } from '../../types';

export const EmployeeSalesDashboard: React.FC = () => {
  const { payments: contextPayments, users, traders } = useAuth();
  const payments = contextPayments;

  const [selectedPeriod, setSelectedPeriod] = useState<UnifiedPeriod>(() => getCurrentUnifiedPeriod());

  // Dynamically compute available reporting periods from payments
  const availablePeriods = useMemo(() => {
    return getAvailableReportingPeriods(payments).map(toUnifiedPeriod);
  }, [payments]);

  const resolveClientContact = (payment: any) => {
    let name = (payment.client_name || payment.trader_name || '').trim();
    let phone = (payment.client_phone || payment.trader_phone || '').trim();

    if ((!name || name.toLowerCase() === 'client' || name.toLowerCase() === 'direct client') || !phone) {
      const matched = traders.find((t) => 
        (payment.trader_id && t.id === payment.trader_id) ||
        (phone && t.phone && t.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );
      if (matched) {
        if (!name || name.toLowerCase() === 'client' || name.toLowerCase() === 'direct client') name = matched.name;
        if (!phone) phone = matched.phone;
      }
    }

    if ((!name || !phone) && typeof payment.remarks === 'string') {
      if (!name) {
        const nameMatch = payment.remarks.match(/(?:Client|Name|Client Name)\s*:\s*([^\n;,]+)/i);
        if (nameMatch) name = nameMatch[1].trim();
      }
      if (!phone) {
        const phoneMatch = payment.remarks.match(/(?:Phone|Mobile|Contact)\s*:\s*([0-9\+\s-]{10,14})/i);
        if (phoneMatch) phone = phoneMatch[1].replace(/\D/g, '').slice(-10);
      }
    }

    return {
      displayName: name || 'Client',
      displayPhone: phone,
    };
  };

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Equity' | 'Commodity'>('all');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [inspectProfileUser, setInspectProfileUser] = useState<User | null>(null);

  // Filter only approved payments belonging to the selected period
  const periodApprovedPayments = useMemo(() => {
    return payments.filter(
      (p) => p.status === 'approved' && isDateInReportingPeriod(p.transaction_time || p.created_at, selectedPeriod)
    );
  }, [payments, selectedPeriod]);

  // Overall all-time approved payments for reference
  const allTimeApprovedPayments = useMemo(() => {
    return payments.filter((p) => p.status === 'approved');
  }, [payments]);

  // High-level payment statistics for Admin for the selected period
  const adminKPIs = useMemo(() => {
    const periodPayments = payments.filter((p) =>
      isDateInReportingPeriod(p.transaction_time || p.created_at, selectedPeriod)
    );
    const totalPaymentsCount = periodPayments.length;
    const pendingCount = periodPayments.filter((p) => p.status === 'pending_verification').length;
    const approvedCount = periodApprovedPayments.length;
    const rejectedCount = periodPayments.filter((p) => p.status === 'rejected').length;

    const totalPaymentAmount = periodApprovedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const sharedPaymentCount = periodApprovedPayments.filter((p) => p.is_shared || (p.allocations && p.allocations.length > 1)).length;

    // Breakdown by Service Category
    const equitySales = periodApprovedPayments
      .filter((p) => p.service_category === 'Equity')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const commoditySales = periodApprovedPayments
      .filter((p) => p.service_category === 'Commodity')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Breakdown by Duration
    const durationSales = {
      '3 Months': periodApprovedPayments
        .filter((p) => p.subscription_duration === '3 Months')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      '6 Months': periodApprovedPayments
        .filter((p) => p.subscription_duration === '6 Months')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      'Yearly': periodApprovedPayments
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
  }, [payments, periodApprovedPayments, selectedPeriod]);

  // Calculate statistics per employee based on individual allocations for the selected period
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
        payment: typeof allTimeApprovedPayments[0];
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

    const BHAVANI_CANONICAL_ID = '99b02b72-2886-4257-acc5-6ce655f8e4dc';
    const getCanonicalEmpId = (id?: string | null, name?: string | null): string => {
      if (isBhavaniUser(id) || isBhavaniUser(name)) return BHAVANI_CANONICAL_ID;
      return id || 'direct';
    };

    // Initialize stats for staff
    users.forEach(user => {
      if (['employee', 'admin'].includes(user.role)) {
        if (isBhavaniUser(user) && user.id !== BHAVANI_CANONICAL_ID) {
          return;
        }
        const targetId = isBhavaniUser(user) ? BHAVANI_CANONICAL_ID : user.id;
        stats[targetId] = {
          id: targetId,
          name: isBhavaniUser(user) ? 'Bhavani N' : user.name,
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

    // Process all approved payments to accumulate totals and isolate selected period
    allTimeApprovedPayments.forEach(payment => {
      const tx = payment.transaction_time || payment.created_at;
      const txDate = new Date(tx);
      const txDateStr = tx.split('T')[0];
      const inSelectedPeriod = isDateInReportingPeriod(tx, selectedPeriod);

      if (payment.allocations && payment.allocations.length > 0) {
        // Multi-employee allocation distribution
        payment.allocations.forEach(alloc => {
          const empId = getCanonicalEmpId(alloc.employee_id, alloc.employee_name);
          const isBhavani = isBhavaniUser(empId) || isBhavaniUser(alloc.employee_name);
          if (!stats[empId]) {
            stats[empId] = {
              id: empId,
              name: isBhavani ? 'Bhavani N' : (alloc.employee_name || 'Staff'),
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

          // If payment falls inside the chosen reporting period
          if (inSelectedPeriod) {
            stats[empId].monthly += credited;
            stats[empId].payments.push({
              payment,
              creditedAmount: credited,
              allocationPercentage: alloc.allocation_percentage || 100,
              isShared: payment.allocations!.length > 1,
            });

            if (selectedPeriod.isCurrent) {
              if (txDateStr === todayStr) stats[empId].daily += credited;
              if (txDate >= startOfWeek) stats[empId].weekly += credited;
            }
          }
        });
      } else {
        // Single employee / Direct payment
        const empId = getCanonicalEmpId(payment.employee_id, payment.employee_name);
        const isBhavani = isBhavaniUser(empId) || isBhavaniUser(payment.employee_name) || isBhavaniUser(payment.remarks);
        if (!stats[empId]) {
          stats[empId] = {
            id: empId,
            name: isBhavani ? 'Bhavani N' : (payment.employee_name || 'Unknown'),
            role: 'Employee',
            daily: 0,
            weekly: 0,
            monthly: 0,
            total: 0,
            payments: [],
          };
        }

        const credited = Number(payment.amount) || 0;
        stats[empId].total += credited;

        // If payment falls inside the chosen reporting period
        if (inSelectedPeriod) {
          stats[empId].monthly += credited;
          stats[empId].payments.push({
            payment,
            creditedAmount: credited,
            allocationPercentage: 100,
            isShared: false,
          });

          if (selectedPeriod.isCurrent) {
            if (txDateStr === todayStr) stats[empId].daily += credited;
            if (txDate >= startOfWeek) stats[empId].weekly += credited;
          }
        }
      }
    });

    // Sort payments within each employee by newest first
    Object.values(stats).forEach(stat => {
      stat.payments.sort(
        (a, b) => new Date(b.payment.transaction_time || b.payment.created_at).getTime() - new Date(a.payment.transaction_time || a.payment.created_at).getTime()
      );
    });

    // Return employees active in the period, or active employees with lifetime volume
    return Object.values(stats)
      .filter(s => s.monthly > 0 || (selectedPeriod.isCurrent && s.total > 0))
      .sort((a, b) => b.monthly - a.monthly || b.total - a.total);
  }, [allTimeApprovedPayments, users, selectedPeriod]);

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

        {/* Reporting Period Selector */}
        <div className="self-start md:self-auto">
          <ReportingPeriodSelector
            periods={availablePeriods}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            includeAllTime={false}
          />
        </div>
      </div>

      {/* Top Admin KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{selectedPeriod.label} Approved Sales</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-1">
            {formatINR(adminKPIs.totalPaymentAmount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            {adminKPIs.approvedCount} verified in {selectedPeriod.shortLabel}
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
            In {selectedPeriod.shortLabel}
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

      {/* Compact & Interactive Employee Sales Cards */}
      <div className="space-y-3">
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
              const { displayName, displayPhone } = resolveClientContact(payment);
              return (
                displayName.toLowerCase().includes(q) ||
                displayPhone.toLowerCase().includes(q) ||
                payment.utr.toLowerCase().includes(q) ||
                payment.payment_mode.toLowerCase().includes(q) ||
                (payment.service_category && payment.service_category.toLowerCase().includes(q))
              );
            });

            const empUser = users.find(
              (u) => u.id === stat.id || u.name.toLowerCase() === stat.name.toLowerCase()
            );

            return (
              <div 
                key={stat.id} 
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
                  isExpanded ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Streamlined Card Header */}
                <div 
                  onClick={() => toggleCard(stat.id)}
                  className="p-3 sm:px-4 sm:py-3 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 select-none hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Employee Profile Summary */}
                  <div className="flex items-center gap-3 min-w-0 md:w-1/3 shrink-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-xs overflow-hidden">
                        {empUser?.avatar_url ? (
                          <img src={empUser.avatar_url} alt={stat.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-sm">{stat.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="flex w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-xs" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight hover:text-blue-600 transition-colors truncate">
                          {stat.name}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {stat.role}
                        </span>
                        {empUser?.blood_group && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                            <Droplet className="w-2 h-2 fill-rose-500/20" /> {empUser.blood_group}
                          </span>
                        )}
                        {empUser && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectProfileUser(empUser);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Inspect Profile & Office Desk"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono truncate">
                        {empUser?.office_phone ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            <Building2 className="w-2.5 h-2.5" /> Desk: {empUser.office_phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">Office desk not set</span>
                        )}
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-500 hidden sm:inline">{stat.payments.length} verified sales</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Compact Metrics Strip */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap">
                    {selectedPeriod.isCurrent ? (
                      <>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Today</span>
                            <span className="text-xs sm:text-sm font-black text-slate-800 tabular-nums block leading-tight">
                              {formatINR(stat.daily)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">This Week</span>
                            <span className="text-xs sm:text-sm font-black text-indigo-700 tabular-nums block leading-tight">
                              {formatINR(stat.weekly)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Deals</span>
                            <span className="text-xs sm:text-sm font-black text-slate-800 tabular-nums block leading-tight">
                              {stat.payments.length} sales
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Share</span>
                            <span className="text-xs sm:text-sm font-black text-indigo-700 tabular-nums block leading-tight">
                              {adminKPIs.totalPaymentAmount > 0 ? ((stat.monthly / adminKPIs.totalPaymentAmount) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Period Sales & Toggle Button */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t border-slate-100 md:border-t-0">
                    <div className="text-left md:text-right">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block font-mono">
                        {selectedPeriod.shortLabel} Credited
                      </span>
                      <div className="text-base sm:text-lg font-black text-emerald-700 tabular-nums leading-tight">
                        {formatINR(stat.monthly)}
                      </div>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        Life: {formatINR(stat.total)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                        isExpanded
                          ? 'bg-blue-600 text-white shadow-blue-500/20'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>Ledger</span>
                      <span className="text-[10px] opacity-80 font-mono">({stat.payments.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                  {/* Expanded Area: Spreadsheet Data */}
                  <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="border-t border-slate-100 bg-slate-50/70">
                        <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-xs font-bold text-slate-800">Verified Submissions Ledger</h4>
                            <span className="text-[10px] font-mono font-bold bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/50">
                              {stat.payments.length} Records
                            </span>
                          </div>
                          
                          <div className="relative w-full md:w-64 group/search">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within/search:text-blue-500 transition-colors" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search UTR, Client, Mode..."
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 font-medium shadow-2xs"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto px-2 sm:px-4 pb-3">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-200/80 text-slate-400 uppercase text-[9px] font-bold tracking-wider font-mono">
                                <th className="py-2.5 px-3 pl-0">Date & Time</th>
                                <th className="py-2.5 px-3">Client / Trader</th>
                                <th className="py-2.5 px-3">Service Package</th>
                                <th className="py-2.5 px-3 text-right">Credited Share</th>
                                <th className="py-2.5 px-3">Mode & Sharing</th>
                                <th className="py-2.5 px-3">Bank Ref (UTR)</th>
                                <th className="py-2.5 px-3 text-right pr-0">Visual Proof</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredCardPayments.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-sm">
                                    No records match your search for this employee.
                                  </td>
                                </tr>
                              ) : (
                                filteredCardPayments.map(({ payment, creditedAmount, allocationPercentage, isShared }) => (
                                  <tr key={payment.id} className="hover:bg-blue-50/30 transition-colors group/row">
                                    <td className="py-2.5 px-3 pl-0 font-mono text-slate-500 text-[11px]">
                                      {new Date(payment.transaction_time).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {(() => {
                                        const { displayName, displayPhone } = resolveClientContact(payment);
                                        return (
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-black text-[10px] flex items-center justify-center border border-blue-200/60 shrink-0">
                                              {(displayName || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <span className="font-bold text-slate-800 text-xs block leading-tight">
                                                {displayName}
                                              </span>
                                              {displayPhone ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                  <span className="text-[10px] text-slate-500 font-mono">
                                                    {displayPhone}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(displayPhone);
                                                      setCopiedPhoneId(payment.id);
                                                      setTimeout(() => setCopiedPhoneId(null), 1800);
                                                    }}
                                                    className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                                    title="Copy Phone"
                                                  >
                                                    {copiedPhoneId === payment.id ? (
                                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                                    ) : (
                                                      <Copy className="w-3 h-3" />
                                                    )}
                                                  </button>
                                                </div>
                                              ) : (
                                                <span className="text-[10px] text-slate-400 italic">No phone</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {payment.service_category ? (
                                        <div className="leading-tight">
                                            <span className="font-bold text-slate-800 text-xs block">
                                              {payment.service_category} • {payment.service_type === 'Future Option' ? 'Option' : payment.service_type}
                                            </span>
                                          <span className="text-[10px] font-semibold text-teal-600">
                                            {payment.subscription_duration}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-[11px]">Standard</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="font-black text-emerald-700 text-xs sm:text-sm block">
                                        {formatINR(creditedAmount)}
                                      </span>
                                      {isShared && (
                                        <span className="text-[9px] text-slate-400 block font-mono">
                                          {allocationPercentage}% of {formatINR(payment.amount)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100/80 text-slate-700 font-semibold text-[10px] border border-slate-200/50">
                                        {payment.payment_mode}
                                      </span>
                                      {isShared && (
                                        <span className="block text-[9px] font-bold text-blue-700 mt-0.5">
                                          Shared Sale ({payment.allocations?.length} staff)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 text-xs group-hover/row:text-blue-600 transition-colors">
                                      {payment.utr}
                                    </td>
                                    <td className="py-2.5 px-3 pr-0">
                                      <div className="flex items-center justify-end">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage(payment.screenshot_url);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 bg-white hover:border-blue-400 hover:bg-blue-50 text-blue-600 font-bold transition-all shadow-2xs hover:shadow active:scale-95 text-xs"
                                        >
                                          <ZoomIn className="w-3.5 h-3.5" /> 
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

      {/* Employee Profile & Office Desk Modal */}
      <ProfileModal
        isOpen={Boolean(inspectProfileUser)}
        onClose={() => setInspectProfileUser(null)}
        targetUser={inspectProfileUser}
      />
    </div>
  );
};
