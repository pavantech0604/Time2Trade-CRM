import { User, Lead, ActiveTrader, TradingDay, Payment, Expense, NotificationItem, AuditLog } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Karthik Muni',
    email: 'karthik@time2trade.com',
    phone: '+91 98765 43210',
    role: 'admin',
    is_active: true,
    approval_status: 'approved',
    approved_by: 'System Seed',
    approved_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  }
];

export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_TRADERS: ActiveTrader[] = [];
export const INITIAL_TRADING_DAYS: TradingDay[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_USER_PRESENCE: import('../types').UserPresence[] = [];
export const INITIAL_ATTENDANCE_LOGS: import('../types').AttendanceLog[] = [];
