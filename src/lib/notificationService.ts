import type { Lead, NotificationItem, Payment, User } from '../types';
import { canAccessTab, ownsPayment } from './accessControl';

export function buildAccountNotifications(user: User | null, payments: Payment[], leads: Lead[], users: User[]): NotificationItem[] {
  if (!user || !['admin', 'manager', 'employee'].includes(user.role)) return [];
  const notices: NotificationItem[] = [];
  for (const payment of payments) {
    if (user.role === 'employee' && !ownsPayment(payment, user.id)) continue;
    const allocation = payment.allocations?.find(a => a.employee_id === user.id);
    const amount = user.role === 'employee' && allocation ? allocation.allocation_amount : payment.amount;
    const pending = payment.status === 'pending_verification';
    const approved = payment.status === 'approved';
    const client = payment.client_name || payment.trader_name || 'Client';
    const action = user.role === 'employee' ? 'employee-dashboard'
      : user.role === 'admin' && pending ? 'payment-verification' : 'employee-sales';
    notices.push({
      id: `live-payment-${user.id}-${payment.id}-${payment.status}`,
      user_id: user.id, user_name: user.name, category: 'sales',
      title: pending ? (user.role === 'admin' ? 'Payment needs verification' : 'Payment submitted')
        : approved ? 'Payment approved' : 'Payment rejected',
      message: `${client} · ${pending ? 'Awaiting administrator verification' : approved ? 'Verified successfully' : 'Review the payment status and resubmit if needed'}.`,
      type: pending ? 'info' : approved ? 'success' : 'warning',
      amount: Number(amount), client_name: client,
      action_tab: action, action_label: pending && user.role === 'admin' ? 'Review payment' : 'View sales',
      created_at: payment.verified_at || payment.created_at,
      is_read: false,
    });
  }
  if (user.role === 'employee') {
    for (const lead of leads.filter(l => l.assigned_to === user.id && !l.is_archived && l.status !== 'active_trader')) {
      notices.push({ id: `live-lead-${user.id}-${lead.id}`, user_id: user.id, title: 'Lead assigned to your desk',
        message: `${lead.name} is assigned to you. Review the client and follow-up details.`,
        category: 'leads', type: 'info', is_read: false, created_at: lead.created_at,
        action_tab: 'employee-dashboard', action_label: 'Open my desk' });
    }
  }
  if (user.role === 'admin') {
    for (const applicant of users.filter(u => u.approval_status === 'pending_admin_review')) {
      notices.push({ id: `live-approval-${user.id}-${applicant.id}`, user_id: user.id, title: 'Staff approval required',
        message: `${applicant.name} is waiting for an account review.`, category: 'system', type: 'warning',
        is_read: false, created_at: applicant.created_at, action_tab: 'employee-management', action_label: 'Review application' });
    }
  }
  return notices;
}

export function accountNotificationFeed(user: User | null, live: NotificationItem[], saved: NotificationItem[]): NotificationItem[] {
  if (!user) return [];
  const own = saved.filter(n => n.user_id === user.id && !n.id.startsWith('sample-'));
  const preferences = new Map(own.map(n => [n.id, n]));
  const merged: NotificationItem[] = live.map(n => ({ ...n, is_read: preferences.get(n.id)?.is_read ?? false,
    dismissed_at: preferences.get(n.id)?.dismissed_at }));
  // Old sales/lead messages can become stale after verification. Live records
  // are the source of truth; retain genuine standalone system events only.
  merged.push(...own.filter(n => !n.id.startsWith('live-') && n.category === 'system'));
  return merged.filter(n => n.user_id === user.id && !n.dismissed_at && (!n.action_tab || canAccessTab(user.role, n.action_tab)))
    .sort((a,b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))
    .slice(0, 100);
}
