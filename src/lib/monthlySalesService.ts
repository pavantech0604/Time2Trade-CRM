import {
  MonthlyReportingPeriod,
  MonthlySalesSummary,
  DailySalesTrendPoint,
  EmployeeMonthlyPerformance,
  MonthlyTargetRecord,
  Payment,
  PaymentAllocation,
  User,
  Lead,
  ActiveTrader,
} from '../types';
import { isBhavaniUser } from '../context/AuthContext';
import { supabase } from './supabase';

/**
 * Timezone Configuration: Indian Standard Time (IST) UTC+05:30
 */
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current timestamp in Indian Standard Time (IST)
 */
export function getIndianNow(): Date {
  // Return current Date object adjusted for IST representation
  return new Date();
}

/**
 * Extracts year, month (1-12), and day (1-31) in Indian Standard Time
 */
export function getISTDateParts(dateInput: string | Date | number): {
  year: number;
  month: number;
  day: number;
  dateKey: string;
} {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
      dateKey: fallback.toISOString().slice(0, 10),
    };
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.format(d).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, dateKey };
}

/**
 * Returns exact start and end Date boundaries for any given reporting month in IST.
 * - Start: 00:00:00.000 IST on 1st of month
 * - End: 00:00:00.000 IST on 1st of next month
 */
export function getMonthBoundaries(year: number, month: number): {
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  totalDays: number;
} {
  const safeYear = Math.max(2020, Math.min(2100, Math.floor(year)));
  const safeMonth = Math.max(1, Math.min(12, Math.floor(month)));

  const mStr = String(safeMonth).padStart(2, '0');
  const startDateIso = `${safeYear}-${mStr}-01T00:00:00+05:30`;

  let nextYear = safeYear;
  let nextMonth = safeMonth + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const nmStr = String(nextMonth).padStart(2, '0');
  const endDateIso = `${nextYear}-${nmStr}-01T00:00:00+05:30`;

  // Determine total days in this specific month (28, 29 for leap year, 30, 31)
  const totalDays = new Date(safeYear, safeMonth, 0).getDate();

  return {
    startDate: new Date(startDateIso),
    endDate: new Date(endDateIso),
    startDateIso,
    endDateIso,
    totalDays,
  };
}

/**
 * Returns previous calendar month { year, month } with year-boundary safety
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns next calendar month { year, month } with year-boundary safety
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month >= 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Human-readable month label (e.g., "October 2026" or "Oct 2026")
 */
export function formatMonthLabel(year: number, month: number, short = false): string {
  // Using reference date: year, month - 1, 15
  const d = new Date(year, month - 1, 15);
  return d.toLocaleDateString('en-IN', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

/**
 * Generates reporting period descriptor
 */
export function createReportingPeriod(year: number, month: number): MonthlyReportingPeriod {
  const boundaries = getMonthBoundaries(year, month);
  const currentIST = getISTDateParts(new Date());
  const isCurrent = currentIST.year === year && currentIST.month === month;

  return {
    year,
    month,
    label: formatMonthLabel(year, month, false),
    shortLabel: formatMonthLabel(year, month, true),
    isCurrent,
    startDateIso: boundaries.startDateIso,
    endDateIso: boundaries.endDateIso,
    totalDays: boundaries.totalDays,
  };
}

/**
 * Dynamically computes all available historical reporting periods from existing data
 * up to the current Indian local business month.
 * Future months are never included.
 */
export function getAvailableReportingPeriods(
  payments: Payment[] = [],
  crmStartDate = '2026-09-01'
): MonthlyReportingPeriod[] {
  const currentIST = getISTDateParts(new Date());

  // Find earliest transaction or CRM launch date
  let earliestYear = 2026;
  let earliestMonth = 9; // Default launch September 2026

  try {
    const crmStartParts = getISTDateParts(crmStartDate);
    earliestYear = crmStartParts.year;
    earliestMonth = crmStartParts.month;
  } catch {}

  payments.forEach((p) => {
    const txDateStr = p.transaction_time || p.created_at;
    if (txDateStr) {
      const parts = getISTDateParts(txDateStr);
      if (
        parts.year < earliestYear ||
        (parts.year === earliestYear && parts.month < earliestMonth)
      ) {
        earliestYear = parts.year;
        earliestMonth = parts.month;
      }
    }
  });

  // Ensure earliest is not after current
  if (
    earliestYear > currentIST.year ||
    (earliestYear === currentIST.year && earliestMonth > currentIST.month)
  ) {
    earliestYear = currentIST.year;
    earliestMonth = currentIST.month;
  }

  const periods: MonthlyReportingPeriod[] = [];
  let y = currentIST.year;
  let m = currentIST.month;

  // Generate descending from current month down to earliest month
  while (y > earliestYear || (y === earliestYear && m >= earliestMonth)) {
    periods.push(createReportingPeriod(y, m));
    const prev = getPreviousMonth(y, m);
    y = prev.year;
    m = prev.month;
  }

  return periods;
}

/**
 * Canonical Bhavani identifier helper for user grouping
 */
const BHAVANI_CANONICAL_ID = '99b02b72-2886-4257-acc5-6ce655f8e4dc';
export const getCanonicalEmpId = (id?: string | null, name?: string | null): string => {
  if (isBhavaniUser(id) || isBhavaniUser(name)) return BHAVANI_CANONICAL_ID;
  return id || 'direct';
};

/**
 * Storage key for target management cache
 */
const TARGETS_STORAGE_KEY = 'time2trade_monthly_targets_cache';

/**
 * Default monthly targets
 */
const DEFAULT_COMPANY_TARGETS: Record<string, number> = {
  '2026-09': 5000000, // ₹50 Lakhs baseline for September 2026
  '2026-10': 6000000, // ₹60 Lakhs for October 2026
};

/**
 * Retrieves the monthly sales target for a specific period
 */
export function getMonthlyTarget(year: number, month: number, employeeId?: string | null): number {
  const periodKey = `${year}-${String(month).padStart(2, '0')}`;
  const key = employeeId ? `${periodKey}_${employeeId}` : periodKey;

  try {
    const stored = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (stored) {
      const parsed: Record<string, number> = JSON.parse(stored);
      if (typeof parsed[key] === 'number') {
        return parsed[key];
      }
    }
  } catch {}

  // If specific employee, default to an equitable share or ₹5 Lakhs
  if (employeeId) {
    return 500000;
  }

  // Default company target
  if (DEFAULT_COMPANY_TARGETS[periodKey]) {
    return DEFAULT_COMPANY_TARGETS[periodKey];
  }

  return 6000000; // Default ₹60 Lakhs
}

/**
 * Saves or updates a monthly target in local cache and optionally Supabase
 */
export async function saveMonthlyTarget(
  year: number,
  month: number,
  targetAmount: number,
  employeeId?: string | null,
  notes?: string
): Promise<boolean> {
  const periodKey = `${year}-${String(month).padStart(2, '0')}`;
  const key = employeeId ? `${periodKey}_${employeeId}` : periodKey;

  try {
    let currentMap: Record<string, number> = {};
    const stored = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (stored) {
      currentMap = JSON.parse(stored);
    }
    currentMap[key] = Math.max(0, targetAmount);
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(currentMap));
  } catch {}

  // Attempt to sync to Supabase if configured
  if (supabase) {
    try {
      await supabase.from('monthly_targets').upsert(
        {
          year,
          month,
          target_amount: targetAmount,
          employee_id: employeeId || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'year,month,employee_id' }
      );
    } catch {
      // Gracefully continue with local storage if remote table is pending migration
    }
  }

  return true;
}

/**
 * Role-Based Filter: Checks if a payment is accessible to the current user
 */
export function isPaymentAuthorized(
  payment: Payment,
  currentUser: User | null
): boolean {
  if (!currentUser) return false;

  // Admins and Managers have organization-wide visibility
  if (currentUser.role === 'admin' || currentUser.role === 'manager') {
    return true;
  }

  // Employee: Only payments where they are assigned, submitted, or allocated
  const isCurrentBhavani = isBhavaniUser(currentUser);
  const curId = (currentUser.id || '').toLowerCase().trim();
  const curName = (currentUser.name || '').toLowerCase().trim();

  const checkMatch = (empId?: string, empName?: string) => {
    if (isCurrentBhavani && (isBhavaniUser(empId) || isBhavaniUser(empName))) {
      return true;
    }
    if (empId && empId.toLowerCase().trim() === curId) return true;
    if (empName && empName.toLowerCase().trim() === curName) return true;
    return false;
  };

  if (checkMatch(payment.employee_id, payment.employee_name)) return true;
  if (checkMatch(payment.submitted_by_employee_id, payment.submitted_by_employee_name)) return true;

  if (payment.allocations && payment.allocations.length > 0) {
    return payment.allocations.some((a) => checkMatch(a.employee_id, a.employee_name));
  }

  return false;
}

/**
 * Core Monthly Sales Calculation Engine
 * Computes all metrics, daily trend, MoM comparisons, and employee performance
 * for any given calendar month and year.
 */
export function calculateMonthlySalesData({
  year,
  month,
  payments,
  users,
  leads = [],
  traders = [],
  currentUser,
}: {
  year: number;
  month: number;
  payments: Payment[];
  users: User[];
  leads?: Lead[];
  traders?: ActiveTrader[];
  currentUser: User | null;
}): {
  summary: MonthlySalesSummary;
  dailyTrend: DailySalesTrendPoint[];
  employeePerformance: EmployeeMonthlyPerformance[];
  monthlyTransactions: Payment[];
} {
  const period = createReportingPeriod(year, month);
  const boundaries = getMonthBoundaries(year, month);
  const currentIST = getISTDateParts(new Date());

  // 1. Filter transactions falling strictly within [startDate, endDate)
  const allPeriodPayments = payments.filter((p) => {
    const rawDate = p.transaction_time || p.created_at;
    if (!rawDate) return false;
    const txDate = new Date(rawDate);
    if (isNaN(txDate.getTime())) return false;
    return txDate >= boundaries.startDate && txDate < boundaries.endDate;
  });

  // 2. Apply Role Authorization
  const authorizedPeriodPayments = allPeriodPayments.filter((p) =>
    isPaymentAuthorized(p, currentUser)
  );

  // 3. Separate Approved (Official Sales/Revenue) vs Other Statuses
  const approvedPayments = authorizedPeriodPayments.filter((p) => p.status === 'approved');

  // Compute Revenue for this period
  let totalRevenue = 0;
  let equitySales = 0;
  let commoditySales = 0;
  let sharedPaymentsCount = 0;

  const isEmployeeRole = currentUser?.role === 'employee';

  approvedPayments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    const isShared = Boolean(p.is_shared || (p.allocations && p.allocations.length > 1));
    if (isShared) sharedPaymentsCount++;

    if (p.service_category === 'Commodity') {
      commoditySales += amt;
    } else {
      equitySales += amt;
    }

    if (isEmployeeRole && p.allocations && p.allocations.length > 0) {
      // If employee, only count their credited portion
      const myAlloc = p.allocations.find((a) => {
        if (isBhavaniUser(currentUser)) return isBhavaniUser(a.employee_id) || isBhavaniUser(a.employee_name);
        return a.employee_id === currentUser?.id || a.employee_name === currentUser?.name;
      });
      totalRevenue += myAlloc ? Number(myAlloc.allocation_amount || 0) : amt;
    } else {
      totalRevenue += amt;
    }
  });

  const totalSales = approvedPayments.length;
  const dealsClosed = totalSales;
  const averageDealSize = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

  // 4. Previous Month Calculations for MoM Comparison
  const prevPeriodInfo = getPreviousMonth(year, month);
  const prevBoundaries = getMonthBoundaries(prevPeriodInfo.year, prevPeriodInfo.month);

  const prevMonthApprovedPayments = payments.filter((p) => {
    if (p.status !== 'approved') return false;
    if (!isPaymentAuthorized(p, currentUser)) return false;
    const rawDate = p.transaction_time || p.created_at;
    if (!rawDate) return false;
    const txDate = new Date(rawDate);
    return txDate >= prevBoundaries.startDate && txDate < prevBoundaries.endDate;
  });

  let prevMonthRevenue = 0;
  prevMonthApprovedPayments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    if (isEmployeeRole && p.allocations && p.allocations.length > 0) {
      const myAlloc = p.allocations.find((a) => {
        if (isBhavaniUser(currentUser)) return isBhavaniUser(a.employee_id) || isBhavaniUser(a.employee_name);
        return a.employee_id === currentUser?.id || a.employee_name === currentUser?.name;
      });
      prevMonthRevenue += myAlloc ? Number(myAlloc.allocation_amount || 0) : amt;
    } else {
      prevMonthRevenue += amt;
    }
  });
  const prevMonthSales = prevMonthApprovedPayments.length;

  // MoM % change with Zero-Division Protection
  let revenueMomPercent: number | null = null;
  let revenueMomStatus: 'up' | 'down' | 'neutral' | 'no_baseline' = 'no_baseline';

  if (prevMonthRevenue > 0) {
    const diff = totalRevenue - prevMonthRevenue;
    const pct = (diff / prevMonthRevenue) * 100;
    revenueMomPercent = parseFloat(pct.toFixed(1));
    if (revenueMomPercent > 0) revenueMomStatus = 'up';
    else if (revenueMomPercent < 0) revenueMomStatus = 'down';
    else revenueMomStatus = 'neutral';
  } else if (totalRevenue > 0) {
    revenueMomStatus = 'no_baseline'; // New activity this month
  } else {
    revenueMomStatus = 'neutral';
  }

  // 5. Target & Achievement
  const monthlyTarget = getMonthlyTarget(
    year,
    month,
    isEmployeeRole ? currentUser?.id : null
  );
  const achievedAmount = totalRevenue;
  const targetRemaining = Math.max(0, monthlyTarget - achievedAmount);
  const targetAchievementPercent =
    monthlyTarget > 0 ? parseFloat(((achievedAmount / monthlyTarget) * 100).toFixed(1)) : 0;

  // 6. Conversions & Leads in this month
  const periodLeads = leads.filter((l) => {
    const rawDate = l.created_at;
    if (!rawDate) return false;
    const ld = new Date(rawDate);
    return ld >= boundaries.startDate && ld < boundaries.endDate;
  });

  const periodTraders = traders.filter((t) => {
    const rawDate = t.joined_at || t.created_at;
    if (!rawDate) return false;
    const td = new Date(rawDate);
    return td >= boundaries.startDate && td < boundaries.endDate;
  });

  const conversionsCount = periodTraders.length;
  const totalLeadsInPeriod = periodLeads.length;
  const conversionRate =
    totalLeadsInPeriod > 0
      ? parseFloat(((conversionsCount / totalLeadsInPeriod) * 100).toFixed(1))
      : 0;

  // 7. Management Revenue Share (60%) & Retained Share (40%)
  const managerShare = Math.round(totalRevenue * 0.6);
  const companyRetainedShare = totalRevenue - managerShare;

  const summary: MonthlySalesSummary = {
    period,
    totalRevenue,
    totalSales,
    dealsClosed,
    averageDealSize,
    monthlyTarget,
    achievedAmount,
    targetRemaining,
    targetAchievementPercent,
    prevMonthRevenue,
    prevMonthSales,
    revenueMomPercent,
    revenueMomStatus,
    conversionsCount,
    totalLeadsInPeriod,
    conversionRate,
    equitySales,
    commoditySales,
    sharedPaymentsCount,
    managerShare,
    companyRetainedShare,
  };

  // 8. Daily Sales Trend (1 .. totalDays in month)
  const dailyMap = new Map<number, { revenue: number; salesCount: number }>();
  for (let d = 1; d <= boundaries.totalDays; d++) {
    dailyMap.set(d, { revenue: 0, salesCount: 0 });
  }

  approvedPayments.forEach((p) => {
    const rawDate = p.transaction_time || p.created_at;
    const dateParts = getISTDateParts(rawDate);
    const day = dateParts.day;
    if (dailyMap.has(day)) {
      const cur = dailyMap.get(day)!;
      let amt = Number(p.amount) || 0;
      if (isEmployeeRole && p.allocations && p.allocations.length > 0) {
        const myAlloc = p.allocations.find((a) => {
          if (isBhavaniUser(currentUser)) return isBhavaniUser(a.employee_id) || isBhavaniUser(a.employee_name);
          return a.employee_id === currentUser?.id || a.employee_name === currentUser?.name;
        });
        amt = myAlloc ? Number(myAlloc.allocation_amount || 0) : amt;
      }
      cur.revenue += amt;
      cur.salesCount += 1;
    }
  });

  const dailyTrend: DailySalesTrendPoint[] = [];
  const monthAbbr = new Date(year, month - 1, 15).toLocaleDateString('en-IN', { month: 'short' });

  for (let day = 1; day <= boundaries.totalDays; day++) {
    const isFuture =
      period.isCurrent && day > currentIST.day;
    const isToday =
      period.isCurrent && day === currentIST.day;

    const data = dailyMap.get(day) || { revenue: 0, salesCount: 0 };
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const formattedDate = `${String(day).padStart(2, '0')} ${monthAbbr}`;

    dailyTrend.push({
      day,
      dateKey,
      formattedDate,
      revenue: data.revenue,
      salesCount: data.salesCount,
      isFuture,
      isToday,
    });
  }

  // 9. Employee Performance Breakdown
  const employeeMap = new Map<
    string,
    {
      employeeId: string;
      name: string;
      email?: string;
      role: string;
      avatarUrl?: string;
      revenue: number;
      salesCount: number;
      target: number;
      conversionsCount: number;
    }
  >();

  // Initialize staff
  users.forEach((u) => {
    if (['employee', 'admin', 'manager'].includes(u.role) && u.is_active !== false) {
      if (isBhavaniUser(u) && u.id !== BHAVANI_CANONICAL_ID) return;
      const targetId = isBhavaniUser(u) ? BHAVANI_CANONICAL_ID : u.id;
      employeeMap.set(targetId, {
        employeeId: targetId,
        name: isBhavaniUser(u) ? 'Bhavani N' : u.name,
        email: u.email,
        role: u.role === 'employee' ? 'Sales Executive' : u.role === 'manager' ? 'Desk Manager' : 'Admin',
        avatarUrl: u.avatar_url,
        revenue: 0,
        salesCount: 0,
        target: getMonthlyTarget(year, month, targetId),
        conversionsCount: 0,
      });
    }
  });

  // Credit each approved payment
  approvedPayments.forEach((p) => {
    if (p.allocations && p.allocations.length > 0) {
      p.allocations.forEach((alloc) => {
        const empId = getCanonicalEmpId(alloc.employee_id, alloc.employee_name);
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employeeId: empId,
            name: isBhavaniUser(empId) ? 'Bhavani N' : (alloc.employee_name || 'Staff'),
            email: alloc.employee_email,
            role: alloc.employee_role || 'Sales Executive',
            avatarUrl: alloc.employee_avatar,
            revenue: 0,
            salesCount: 0,
            target: getMonthlyTarget(year, month, empId),
            conversionsCount: 0,
          });
        }
        const rec = employeeMap.get(empId)!;
        rec.revenue += Number(alloc.allocation_amount || 0);
        rec.salesCount += 1;
      });
    } else {
      const empId = getCanonicalEmpId(p.employee_id, p.employee_name);
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          name: isBhavaniUser(empId) ? 'Bhavani N' : (p.employee_name || 'Staff'),
          role: 'Sales Executive',
          revenue: 0,
          salesCount: 0,
          target: getMonthlyTarget(year, month, empId),
          conversionsCount: 0,
        });
      }
      const rec = employeeMap.get(empId)!;
      rec.revenue += Number(p.amount || 0);
      rec.salesCount += 1;
    }
  });

  // Count conversions per employee for this month
  periodTraders.forEach((t) => {
    const empId = getCanonicalEmpId(t.employee_id, t.employee_name);
    if (employeeMap.has(empId)) {
      employeeMap.get(empId)!.conversionsCount += 1;
    }
  });

  // Sort and rank employees
  const sortedEmployees = Array.from(employeeMap.values())
    .filter((e) => e.revenue > 0 || e.salesCount > 0 || e.role === 'Sales Executive')
    .sort((a, b) => b.revenue - a.revenue);

  const employeePerformance: EmployeeMonthlyPerformance[] = sortedEmployees.map(
    (emp, index) => {
      const achievementPercent =
        emp.target > 0 ? parseFloat(((emp.revenue / emp.target) * 100).toFixed(1)) : 0;
      const shareOfTotalPercent =
        totalRevenue > 0 ? parseFloat(((emp.revenue / totalRevenue) * 100).toFixed(1)) : 0;

      return {
        ...emp,
        rank: index + 1,
        isTopPerformer: index === 0 && emp.revenue > 0,
        achievementPercent,
        shareOfTotalPercent,
      };
    }
  );

  // Sort transactions newest to oldest
  const monthlyTransactions = [...authorizedPeriodPayments].sort((a, b) => {
    const timeA = new Date(a.transaction_time || a.created_at).getTime();
    const timeB = new Date(b.transaction_time || b.created_at).getTime();
    return timeB - timeA;
  });

  return {
    summary,
    dailyTrend,
    employeePerformance,
    monthlyTransactions,
  };
}
