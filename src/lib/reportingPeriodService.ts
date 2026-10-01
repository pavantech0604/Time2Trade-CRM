import {
  MonthlyReportingPeriod,
  Payment,
  Expense,
  ManagerAdvance,
  Lead,
  ActiveTrader,
} from '../types';
import {
  IST_TIMEZONE,
  getIndianNow,
  getISTDateParts,
  getMonthBoundaries,
  getPreviousMonth,
  getNextMonth,
  formatMonthLabel,
  createReportingPeriod,
  getAvailableReportingPeriods,
} from './monthlySalesService';

// Re-export core date functions so all modules can import from reportingPeriodService
export {
  IST_TIMEZONE,
  getIndianNow,
  getISTDateParts,
  getMonthBoundaries,
  getPreviousMonth,
  getNextMonth,
  formatMonthLabel,
  createReportingPeriod,
  getAvailableReportingPeriods,
};

/**
 * Period Key format: "YYYY-MM" (e.g., "2026-10") or "all_time"
 * Supports both (year, month) and (date: Date | string) in Asia/Kolkata
 */
export function getReportingPeriodKey(
  yearOrDate: number | Date | string,
  month?: number
): string {
  if (typeof yearOrDate === 'number' && typeof month === 'number') {
    return `${yearOrDate}-${String(month).padStart(2, '0')}`;
  }
  try {
    const dateObj = typeof yearOrDate === 'string' ? new Date(yearOrDate) : yearOrDate;
    if (!dateObj || isNaN((dateObj as Date).getTime())) return '';
    const parts = getISTDateParts(dateObj as Date);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Extended reporting period interface supporting All-Time selection
 */
export interface UnifiedPeriod extends MonthlyReportingPeriod {
  periodKey: string; // e.g. "2026-10" or "all_time"
  isAllTime?: boolean;
}

/**
 * The All-Time Period constant
 */
export const ALL_TIME_PERIOD: UnifiedPeriod = {
  year: 0,
  month: 0,
  label: 'All Time',
  shortLabel: 'All Time',
  isCurrent: false,
  isAllTime: true,
  periodKey: 'all_time',
  startDateIso: '2020-01-01T00:00:00+05:30',
  endDateIso: '2099-12-31T23:59:59+05:30',
  totalDays: 0,
};

/**
 * Converts a standard MonthlyReportingPeriod into a UnifiedPeriod
 */
export function toUnifiedPeriod(period: MonthlyReportingPeriod): UnifiedPeriod {
  return {
    ...period,
    periodKey: getReportingPeriodKey(period.year, period.month),
    isAllTime: false,
  };
}

/**
 * Returns current month unified reporting period
 */
export function getCurrentUnifiedPeriod(): UnifiedPeriod {
  const ist = getISTDateParts(new Date());
  return toUnifiedPeriod(createReportingPeriod(ist.year, ist.month));
}

/**
 * Returns the immediately preceding reporting period (e.g. Sep 2026 for Oct 2026)
 */
export function getPreviousReportingPeriod(
  period: UnifiedPeriod | MonthlyReportingPeriod
): UnifiedPeriod {
  const unified = 'periodKey' in period ? period : toUnifiedPeriod(period);
  if (unified.isAllTime) return unified;
  const prevMonth = getPreviousMonth(unified.year, unified.month);
  const prevPeriod = createReportingPeriod(prevMonth.year, prevMonth.month);
  return toUnifiedPeriod(prevPeriod);
}

/**
 * Checks if a given timestamp or YYYY-MM-DD string falls inside a reporting period (using IST)
 */
export function isDateInReportingPeriod(
  dateInput: string | Date | number | null | undefined,
  period: UnifiedPeriod | MonthlyReportingPeriod
): boolean {
  if (!dateInput) return false;
  if ('isAllTime' in period && period.isAllTime) return true;

  // Extract year and month in IST
  const parts = getISTDateParts(dateInput);
  return parts.year === period.year && parts.month === period.month;
}

/**
 * Filter payments that belong to a specific reporting period
 */
export function filterPaymentsByPeriod<T extends { transaction_time?: string; created_at?: string }>(
  payments: T[],
  period: UnifiedPeriod | MonthlyReportingPeriod
): T[] {
  if ('isAllTime' in period && period.isAllTime) return payments;
  return payments.filter((p) => {
    const tx = p.transaction_time || p.created_at;
    return isDateInReportingPeriod(tx, period);
  });
}

/**
 * Filter genuine operational expenses belonging to a specific reporting period
 */
export function filterExpensesByPeriod(
  expenses: Expense[],
  period: UnifiedPeriod | MonthlyReportingPeriod
): Expense[] {
  // First ensure only genuine operational expenses (exclude manager salary advances)
  const operational = expenses.filter((e) => {
    if (!e) return false;
    const cat = (e.category || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    if (cat === 'salary' || cat.includes('advance') || desc.includes('k adv') || desc.includes('advance')) {
      return false;
    }
    return true;
  });

  if ('isAllTime' in period && period.isAllTime) return operational;

  return operational.filter((e) => {
    const dateVal = e.date || e.created_at;
    return isDateInReportingPeriod(dateVal, period);
  });
}

/**
 * Filter manager advances belonging to a specific reporting period
 */
export function filterAdvancesByPeriod(
  advances: ManagerAdvance[],
  period: UnifiedPeriod | MonthlyReportingPeriod,
  managerId?: string | null
): ManagerAdvance[] {
  let list = advances;
  if (managerId && managerId !== 'all') {
    list = list.filter((a) => a.manager_id === managerId);
  }

  if ('isAllTime' in period && period.isAllTime) return list;

  return list.filter((a) => {
    const dateVal = a.date || a.created_at;
    return isDateInReportingPeriod(dateVal, period);
  });
}

/**
 * Comprehensive Period Financial Summary
 */
export interface PeriodFinancialSummary {
  period: UnifiedPeriod;
  isAllTime: boolean;

  // Period Collections & Revenue
  periodApprovedPayments: Payment[];
  periodRevenue: number;
  periodApprovedCount: number;

  // Revenue Allocation (60% Manager, 40% Company Gross)
  periodManagerShare: number;
  periodCompanyGrossShare: number;

  // Period Operational Expenses
  periodOperationalExpenses: Expense[];
  periodExpensesTotal: number;

  // Period Net Profit (Company 40% share minus Period Operating Expenses)
  periodNetCompanyProfit: number;

  // Period Advances & Settlement
  periodAdvances: ManagerAdvance[];
  periodAdvancesTotal: number;
  periodManagerNetPayable: number; // Manager 60% share minus advances taken in this period

  // Cumulative Lifetime Totals (Always retained for executive visibility)
  lifetimeRevenue: number;
  lifetimeManagerShare: number;
  lifetimeAdvancesTotal: number;
  lifetimeBalanceDue: number; // Cumulative 60% share minus all advances given
  lifetimeExpensesTotal: number;
  lifetimeNetCompanyProfit: number;

  // Operational State (Current Platform Pulse)
  totalLeads: number;
  activeTraders: number;
  pendingVerificationCount: number;
}

/**
 * Authoritative Period Financial Calculation Engine
 * Reused across Admin Overview, Reports, and Manager Views.
 */
export function calculatePeriodFinancials({
  period,
  payments,
  expenses,
  managerAdvances,
  leads = [],
  traders = [],
}: {
  period: UnifiedPeriod | MonthlyReportingPeriod;
  payments: Payment[];
  expenses: Expense[];
  managerAdvances: ManagerAdvance[];
  leads?: Lead[];
  traders?: ActiveTrader[];
}): PeriodFinancialSummary {
  const unifiedPeriod: UnifiedPeriod =
    'periodKey' in period ? (period as UnifiedPeriod) : toUnifiedPeriod(period);
  const isAllTime = Boolean(unifiedPeriod.isAllTime);

  // 1. All-Time Base Aggregations (Approved Payments & Operational Expenses)
  const allApprovedPayments = payments.filter((p) => p.status === 'approved');
  const lifetimeRevenue = allApprovedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const lifetimeManagerShare = lifetimeRevenue * 0.60;
  const lifetimeCompanyGross = lifetimeRevenue * 0.40;

  const allOperationalExpenses = expenses.filter((e) => {
    if (!e) return false;
    const cat = (e.category || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    if (cat === 'salary' || cat.includes('advance') || desc.includes('k adv') || desc.includes('advance')) {
      return false;
    }
    return true;
  });
  const lifetimeExpensesTotal = allOperationalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const lifetimeNetCompanyProfit = lifetimeCompanyGross - lifetimeExpensesTotal;

  const lifetimeAdvancesTotal = managerAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const lifetimeBalanceDue = lifetimeManagerShare - lifetimeAdvancesTotal;

  // 2. Period-Filtered Aggregations
  let periodApprovedPayments: Payment[];
  let periodOperationalExpenses: Expense[];
  let periodAdvances: ManagerAdvance[];

  if (isAllTime) {
    periodApprovedPayments = allApprovedPayments;
    periodOperationalExpenses = allOperationalExpenses;
    periodAdvances = managerAdvances;
  } else {
    periodApprovedPayments = allApprovedPayments.filter((p) => {
      const tx = p.transaction_time || p.created_at;
      return isDateInReportingPeriod(tx, unifiedPeriod);
    });

    periodOperationalExpenses = allOperationalExpenses.filter((e) => {
      const dateVal = e.date || e.created_at;
      return isDateInReportingPeriod(dateVal, unifiedPeriod);
    });

    periodAdvances = managerAdvances.filter((a) => {
      const dateVal = a.date || a.created_at;
      return isDateInReportingPeriod(dateVal, unifiedPeriod);
    });
  }

  // 3. Compute Period Financials
  const periodRevenue = periodApprovedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const periodApprovedCount = periodApprovedPayments.length;
  const periodManagerShare = periodRevenue * 0.60;
  const periodCompanyGrossShare = periodRevenue * 0.40;

  const periodExpensesTotal = periodOperationalExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const periodNetCompanyProfit = periodCompanyGrossShare - periodExpensesTotal;

  const periodAdvancesTotal = periodAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const periodManagerNetPayable = periodManagerShare - periodAdvancesTotal;

  // 4. Platform Operational State
  const totalLeads = leads.length;
  const activeTraders = traders.filter((t) => t.status === 'active').length;
  const pendingVerificationCount = payments.filter((p) => p.status === 'pending_verification').length;

  return {
    period: unifiedPeriod,
    isAllTime,
    periodApprovedPayments,
    periodRevenue,
    periodApprovedCount,
    periodManagerShare,
    periodCompanyGrossShare,
    periodOperationalExpenses,
    periodExpensesTotal,
    periodNetCompanyProfit,
    periodAdvances,
    periodAdvancesTotal,
    periodManagerNetPayable,
    lifetimeRevenue,
    lifetimeManagerShare,
    lifetimeAdvancesTotal,
    lifetimeBalanceDue,
    lifetimeExpensesTotal,
    lifetimeNetCompanyProfit,
    totalLeads,
    activeTraders,
    pendingVerificationCount,
  };
}
