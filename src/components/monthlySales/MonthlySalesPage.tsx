import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MonthlyReportingPeriod,
  MonthlySalesSummary,
  DailySalesTrendPoint,
  EmployeeMonthlyPerformance,
  Payment,
} from '../../types';
import {
  getAvailableReportingPeriods,
  calculateMonthlySalesData,
  createReportingPeriod,
  getISTDateParts,
} from '../../lib/monthlySalesService';
import { ReportingPeriodSelector } from './ReportingPeriodSelector';
import { MonthlyKPISection } from './MonthlyKPISection';
import { SalesTrendChart } from './SalesTrendChart';
import { EmployeePerformanceTable } from './EmployeePerformanceTable';
import { MonthlyTransactionsTable } from './MonthlyTransactionsTable';
import { ImagePreviewModal } from '../common/ImagePreviewModal';
import {
  CalendarDays,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const MonthlySalesPage: React.FC = () => {
  const {
    payments,
    users,
    leads,
    traders,
    currentUser,
    refreshLivePayments,
    isLiveSyncing,
  } = useAuth();

  // Dynamic available reporting periods derived from real data
  const availablePeriods = useMemo(() => {
    return getAvailableReportingPeriods(payments, '2026-09-01');
  }, [payments]);

  // Current Indian business month
  const currentPeriod = useMemo(() => {
    const ist = getISTDateParts(new Date());
    return createReportingPeriod(ist.year, ist.month);
  }, []);

  // Parse URL search params for initial period (e.g. ?period=2026-09)
  const getInitialPeriod = useCallback((): MonthlyReportingPeriod => {
    try {
      const params = new URLSearchParams(window.location.search);
      const periodParam = params.get('period');
      if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
        const [yearStr, monthStr] = periodParam.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        if (y >= 2020 && y <= currentPeriod.year && m >= 1 && m <= 12) {
          // If in future of current period, disallow and fallback to current
          if (y > currentPeriod.year || (y === currentPeriod.year && m > currentPeriod.month)) {
            return currentPeriod;
          }
          return createReportingPeriod(y, m);
        }
      }
    } catch {}
    return currentPeriod;
  }, [currentPeriod]);

  const [selectedPeriod, setSelectedPeriod] = useState<MonthlyReportingPeriod>(getInitialPeriod);
  const [isSwitchingPeriod, setIsSwitchingPeriod] = useState<boolean>(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Sync state to URL and listen to browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setSelectedPeriod(getInitialPeriod());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialPeriod]);

  const handleSelectPeriod = (period: MonthlyReportingPeriod) => {
    if (period.year === selectedPeriod.year && period.month === selectedPeriod.month) return;

    setIsSwitchingPeriod(true);
    setSelectedPeriod(period);

    // Update URL parameter without reload
    try {
      const url = new URL(window.location.href);
      const periodKey = `${period.year}-${String(period.month).padStart(2, '0')}`;
      url.searchParams.set('period', periodKey);
      if (url.searchParams.has('tab') && url.searchParams.get('tab') === 'monthly-sales') {
        url.searchParams.delete('tab');
      }
      window.history.pushState({}, '', url.toString());
    } catch {}

    // Subtle transition delay to guarantee data settles cleanly
    setTimeout(() => {
      setIsSwitchingPeriod(false);
    }, 120);
  };

  // Compute all metrics for the selected period
  const salesData = useMemo(() => {
    return calculateMonthlySalesData({
      year: selectedPeriod.year,
      month: selectedPeriod.month,
      payments,
      users,
      leads,
      traders,
      currentUser,
    });
  }, [selectedPeriod, payments, users, leads, traders, currentUser]);

  const isCurrentMonth = selectedPeriod.isCurrent;
  const userRole = currentUser?.role || 'admin';

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-16">
      {/* ── Page Header & Period Navigation ── */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs relative z-20">
        {/* Subtle decorative ambient lighting (safely clipped inside inner container) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute left-1/4 -bottom-16 w-56 h-56 bg-teal-500/5 rounded-full blur-3xl" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          {/* Title and Period Description */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-primary via-indigo-600 to-brand-accent text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Monthly Sales
                  </h1>
                  {isCurrentMonth ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Current Month
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 font-mono shadow-2xs">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Historical Record
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Automated performance accounting, target milestones, and executive scorecards for{' '}
                  <span className="font-extrabold text-slate-800 font-mono">{selectedPeriod.label}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Period Selector & Refresh */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap sm:flex-nowrap">
            <ReportingPeriodSelector
              periods={availablePeriods}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={handleSelectPeriod}
              isLoading={isSwitchingPeriod}
            />

            <button
              type="button"
              onClick={() => refreshLivePayments()}
              disabled={isLiveSyncing || isSwitchingPeriod}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all cursor-pointer border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs disabled:opacity-50 active:scale-95 flex items-center justify-center shrink-0"
              title="Refresh live sales data from database"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLiveSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Contextual Period Summary Strip ── */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <span className="font-bold text-slate-700">Period Boundaries:</span>
            <span>
              01 {selectedPeriod.shortLabel.split(' ')[0]} {selectedPeriod.year} – {selectedPeriod.totalDays} {selectedPeriod.shortLabel.split(' ')[0]} {selectedPeriod.year}
            </span>
            <span className="text-slate-300">•</span>
            <span>{selectedPeriod.totalDays} Calendar Days</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-500">
              Verified Revenue:{' '}
              <strong className="text-emerald-700 font-bold">
                {salesData.summary.totalRevenue > 0
                  ? `₹${salesData.summary.totalRevenue.toLocaleString('en-IN')}`
                  : '₹0 (New Month Baseline)'}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Closed Deals: <strong className="text-slate-800">{salesData.summary.totalSales}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Keyed Animated Content Container for Smooth Period Transition ── */}
      <div key={selectedPeriod.label} className="space-y-6 animate-in fade-in duration-200">
        {/* ── Monthly Summary KPI Cards ── */}
        <MonthlyKPISection
          summary={salesData.summary}
          userRole={userRole}
          isLoading={isSwitchingPeriod}
        />

        {/* ── Daily Sales Trend Chart ── */}
        <SalesTrendChart
          data={salesData.dailyTrend}
          monthLabel={selectedPeriod.label}
          isCurrentMonth={isCurrentMonth}
          isLoading={isSwitchingPeriod}
        />

        {/* ── Employee Performance Section ── */}
        <EmployeePerformanceTable
          performanceList={salesData.employeePerformance}
          monthLabel={selectedPeriod.label}
          totalMonthRevenue={salesData.summary.totalRevenue}
          userRole={userRole}
          currentUserId={currentUser?.id}
          isLoading={isSwitchingPeriod}
        />

        {/* ── Monthly Sales Transactions Table ── */}
        <MonthlyTransactionsTable
          transactions={salesData.monthlyTransactions}
          monthLabel={selectedPeriod.label}
          onPreviewProof={(url) => setPreviewProofUrl(url)}
          isLoading={isSwitchingPeriod}
        />
      </div>

      {/* ── Screenshot Proof Preview Modal ── */}
      {previewProofUrl && (
        <ImagePreviewModal
          isOpen={Boolean(previewProofUrl)}
          imageUrl={previewProofUrl}
          onClose={() => setPreviewProofUrl(null)}
        />
      )}
    </div>
  );
};
