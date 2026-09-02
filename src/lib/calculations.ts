import { ActiveTrader, TradingDay, Payment, Expense, Lead, DashboardKPIs } from '../types';

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

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalProfitShared - totalExpenses;

  const pendingHandoffsCount = leads.filter((l) => l.status === 'interested_rm_required').length;
  const pendingVerificationCount = payments.filter((p) => p.status === 'pending_verification').length;

  return {
    totalLeads,
    activeTraders,
    totalProfitShared,
    netProfit,
    pendingHandoffsCount,
    pendingVerificationCount,
    totalExpenses,
  };
}

/**
 * Format currency to INR format (₹1,25,000)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
