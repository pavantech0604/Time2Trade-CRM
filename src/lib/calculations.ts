import { ActiveTrader, TradingDay, Payment, Expense, Lead, DashboardKPIs } from '../types';
import { formatINR, formatINRCompact } from './formatters';

// Re-export formatINR and formatINRCompact from the canonical source so existing imports from calculations.ts still work
export { formatINR, formatINRCompact };

/**
 * Streak Calculation Algorithm:
 * Sorts trading days by trade_date DESC.
 * Counts consecutive trading days with trades_count > 0.
 */
export function calculateTraderStreak(tradingDays: TradingDay[]): { currentStreak: number; longestStreak: number } {
  if (!tradingDays || tradingDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Filter days with trades
  const activeDays = tradingDays
    .filter((d) => d.trades_count > 0)
    .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

  if (activeDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let maxStreak = 0;
  let runningStreak = 0;
  let lastDate: Date | null = null;

  for (let i = 0; i < activeDays.length; i++) {
    const currentDate = new Date(activeDays[i].trade_date);
    
    if (i === 0) {
      runningStreak = 1;
      currentStreak = 1;
    } else if (lastDate) {
      const diffTime = Math.abs(lastDate.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runningStreak++;
        if (i === runningStreak - 1) {
          currentStreak++;
        }
      } else {
        runningStreak = 1;
      }
    }

    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }

    lastDate = currentDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, maxStreak),
  };
}

/**
 * Calculate Dashboard Key Performance Indicators (KPIs)
 */
export function calculateDashboardKPIs(
  leads: Lead[],
  traders: ActiveTrader[],
  payments: Payment[],
  expenses: Expense[]
): DashboardKPIs {
  const totalLeads = leads.length;
  const activeTraders = traders.filter((t) => t.status === 'active').length;

  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const totalProfitShared = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Revenue settlement split:
  // - Management receives 60% of verified client collections
  // - Company retains 40% of verified client collections
  // - Company net profit is 40% retained share minus company operational expenses
  const managerShare = totalProfitShared * 0.60;
  const companyGrossShare = totalProfitShared * 0.40;

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = companyGrossShare - totalExpenses;

  const pendingVerificationCount = payments.filter((p) => p.status === 'pending_verification').length;

  return {
    totalLeads,
    activeTraders,
    totalProfitShared,
    managerShare,
    companyGrossShare,
    netProfit,
    pendingVerificationCount,
    totalExpenses,
  };
}

/**
 * Payment-Based Streak Calculation:
 * Counts the total number of approved payments received from all clients
 * linked to a given employee. This count IS the streak value.
 * 
 * Activity Levels:
 *   - high:   >= 10 payments
 *   - medium: >= 5 payments
 *   - low:    < 5 payments
 */
export function calculatePaymentStreak(
  payments: Payment[],
  employeeId: string
): { paymentCount: number; activityLevel: 'high' | 'medium' | 'low' } {
  const approvedForEmployee = payments.filter((p) => {
    if (p.status !== 'approved') return false;

    // Check direct employee assignment
    if (p.employee_id === employeeId) return true;
    if (p.submitted_by_employee_id === employeeId) return true;

    // Check allocations
    if (p.allocations && p.allocations.some((a) => a.employee_id === employeeId)) return true;

    return false;
  });

  const paymentCount = approvedForEmployee.length;
  const activityLevel: 'high' | 'medium' | 'low' =
    paymentCount >= 10 ? 'high' : paymentCount >= 5 ? 'medium' : 'low';

  return { paymentCount, activityLevel };
}

/**
 * Manager Share & Employee Salary Distribution Calculator
 * 
 * Business Rule:
 *   - Manager's share = 60% of total approved sales
 *   - Employee pool   = 40% of total approved sales
 *   - Each employee's salary is proportional to their sales contribution
 *     within the 40% pool:
 *       employeeSalary = (employeeSales / totalSales) × employeePool
 */
export function calculateSalaryDistribution(
  payments: Payment[],
  employeeIds: string[]
): {
  totalSales: number;
  managerShare: number;
  employeePool: number;
  employeeDistributions: Array<{
    employeeId: string;
    salesTotal: number;
    percentage: number;
    salary: number;
  }>;
} {
  const approved = payments.filter((p) => p.status === 'approved');
  const totalSales = approved.reduce((sum, p) => sum + Number(p.amount), 0);

  const managerShare = totalSales * 0.60;
  const employeePool = totalSales * 0.40;

  // Compute sales credited to each employee
  const employeeSalesMap: Record<string, number> = {};
  employeeIds.forEach((id) => { employeeSalesMap[id] = 0; });

  approved.forEach((p) => {
    if (p.allocations && p.allocations.length > 0) {
      p.allocations.forEach((a) => {
        if (employeeSalesMap[a.employee_id] !== undefined) {
          employeeSalesMap[a.employee_id] += Number(a.allocation_amount || 0);
        }
      });
    } else if (p.employee_id && employeeSalesMap[p.employee_id] !== undefined) {
      employeeSalesMap[p.employee_id] += Number(p.amount);
    }
  });

  const employeeDistributions = employeeIds.map((id) => {
    const salesTotal = employeeSalesMap[id] || 0;
    const percentage = totalSales > 0 ? (salesTotal / totalSales) * 100 : 0;
    const salary = totalSales > 0 ? (salesTotal / totalSales) * employeePool : 0;
    return { employeeId: id, salesTotal, percentage, salary };
  });

  return { totalSales, managerShare, employeePool, employeeDistributions };
}

