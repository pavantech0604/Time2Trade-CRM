import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Bell, CheckCheck, CheckCircle2, Clock, Inbox, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccessTab } from '../../lib/accessControl';
import type { NotificationItem } from '../../types';

interface NotificationCenterProps { isOpen: boolean; onClose: () => void; onNavigate?: (tab: string) => void; }

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onNavigate }) => {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications } = useAuth();
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => { setFilter('all'); }, [currentUser?.id]);
  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('[data-close-notifications]')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.clearInterval(timer);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, currentUser?.id]);
  if (!isOpen || !currentUser) return null;
  const own = notifications.filter(n => n.user_id === currentUser.id && !n.dismissed_at && (!n.action_tab || canAccessTab(currentUser.role, n.action_tab)));
  const unread = own.filter(n => !n.is_read).length;
  const displayed = own.filter(n => filter === 'all' || (filter === 'unread' ? !n.is_read : n.category === filter));
  const relativeTime = (date: string) => {
    const timestamp = Date.parse(date);
    if (!Number.isFinite(timestamp)) return 'Recent';
    const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const openNotification = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.action_tab && canAccessTab(currentUser.role, item.action_tab) && onNavigate) { onNavigate(item.action_tab); onClose(); }
  };
  const tabs = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'sales', label: 'Payments' },
    ...(currentUser.role === 'employee' ? [{ id: 'leads', label: 'Leads' }] : []), { id: 'system', label: 'Account' }];
  return createPortal(<>
    <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-sm" />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="notification-title"
      className="fixed inset-x-3 top-3 bottom-3 z-[101] flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:inset-x-auto md:left-auto md:right-6 md:top-20 md:bottom-6 md:w-[420px] md:max-h-[640px]">
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-2.5 text-teal-800"><Bell size={19} /></div>
            <div className="min-w-0"><h2 id="notification-title" className="font-bold text-slate-900">Your notifications</h2>
              <p className="truncate text-xs text-slate-500">{currentUser.name} · {currentUser.role} workspace</p></div>
          </div>
          <button data-close-notifications type="button" onClick={onClose} aria-label="Close notifications" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white focus-visible:ring-2 focus-visible:ring-teal-500"><X size={18} /></button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-800" aria-live="polite">{unread} unread</span>
          <button type="button" disabled={!unread} onClick={() => markAllNotificationsRead(currentUser.id)} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-40"><CheckCheck size={15} /> Mark all read</button>
        </div>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 p-2" aria-label="Notification filters">
        {tabs.map(tab => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)} className={`min-h-10 flex-1 whitespace-nowrap rounded-xl px-2.5 text-xs font-semibold transition-colors ${filter === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{tab.label}</button>)}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-slate-50/50 p-3">
        {!displayed.length ? <div className="px-4 py-12 text-center"><Inbox size={32} className="mx-auto mb-3 text-teal-600" />
          <h3 className="text-sm font-semibold text-slate-800">{filter === 'unread' ? 'You’re all caught up' : 'No updates here yet'}</h3>
          <p className="mx-auto mt-2 max-w-64 text-xs leading-relaxed text-slate-500">Payment, account and assignment updates for your login will appear here.</p>
        </div> : displayed.map(item => <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white ${item.is_read ? 'border-slate-200' : 'border-teal-200 shadow-sm'}`}>
          <button type="button" onClick={() => openNotification(item)} className="w-full p-3.5 text-left hover:bg-teal-50/40 focus-visible:outline-teal-600">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${item.is_read ? 'text-slate-400' : 'text-teal-700'}`}>{item.is_read ? <CheckCircle2 size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}{item.category || 'Account'}</span>
              <time dateTime={item.created_at} className="flex items-center gap-1 whitespace-nowrap text-[10px] text-slate-400"><Clock size={11} />{relativeTime(item.created_at)}</time>
            </div>
            <h3 className="break-words text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{item.message}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {item.amount !== undefined && <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">₹{Number(item.amount).toLocaleString('en-IN')}</span>}
              {item.action_tab && canAccessTab(currentUser.role, item.action_tab) && <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">{item.action_label || 'Open'}<ArrowUpRight size={13} /></span>}
            </div>
          </button>
          <div className="flex items-center justify-between border-t border-slate-100 px-2">
            <button type="button" onClick={() => markNotificationRead(item.id, !item.is_read)} className="min-h-10 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:text-teal-700">{item.is_read ? 'Mark unread' : 'Mark read'}</button>
            <button type="button" onClick={() => deleteNotification(item.id)} aria-label={`Dismiss ${item.title}`} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-400 hover:text-rose-600"><X size={12} />Dismiss</button>
          </div>
        </article>)}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400"><span>Only updates for your account</span>
        <button type="button" disabled={!own.length} onClick={() => clearAllNotifications(currentUser.id)} className="min-h-10 px-2 font-semibold hover:text-rose-600 disabled:opacity-40">Dismiss all</button>
      </div>
    </div>
  </>, document.body);
};
