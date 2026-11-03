import type { Payment, UserRole } from '../types';

const employeeTabs = new Set(['employee-dashboard', 'my-profile', 'employee-details', 'monthly-sales', 'public-payment-form']);
const managerTabs = new Set(['manager-dashboard', 'employee-details', 'my-profile', 'monthly-sales', 'employee-sales', 'employee-scorecards', 'active-traders', 'team-chat', 'public-payment-form']);

export function canAccessTab(role: UserRole, tab: string): boolean {
  if (role === 'admin') return true;
  if (role === 'manager') return managerTabs.has(tab);
  if (role === 'employee') return employeeTabs.has(tab);
  return false;
}

// Ownership is based on stable account IDs, never partial names or remarks.
export function ownsPayment(payment: Payment, userId: string): boolean {
  return payment.employee_id === userId ||
    payment.submitted_by_employee_id === userId ||
    Boolean(payment.allocations?.some(a => a.employee_id === userId));
}
