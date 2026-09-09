import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  DollarSign,
  ArrowRight,
  User,
  ShieldAlert,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationItem, NotificationCategory } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    currentUser,
    users,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // State
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'me');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key & Lock body scroll on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Target user
  const activeTargetUserId = isAdmin ? selectedUserId : currentUser?.id || '';

  // Employee details for admin
  const targetEmployee = useMemo(() => {
    if (!isAdmin || activeTargetUserId === 'all') return null;
    return users.find((u) => u.id === activeTargetUserId) || null;
  }, [isAdmin, activeTargetUserId, users]);

  // User-filtered notifications (with fallback to sample notifications if empty)
  const userFilteredNotifications = useMemo(() => {
    const list = notifications.filter((n) => {
      if (!isAdmin) {
        return n.user_id === currentUser?.id;
      }
      if (activeTargetUserId === 'all') {
        return true;
      }
      return n.user_id === activeTargetUserId;
    });

    // If active user has no notifications, provide initial sample notifications
    if (list.length === 0 && currentUser) {
      const now = new Date();
      const subMins = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
      const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

      return [
        {
          id: 'sample-1',
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Payment Credited',
          message: 'Payment proof of ₹25,000 for client Rahul Sharma verified. Your 10% commission of ₹2,500 has been credited.',
          type: 'success',
          category: 'sales',
          amount: 2500,
          share_percentage: 10,
          client_name: 'Rahul Sharma',
          action_tab: 'employee-dashboard',
          action_label: 'View Credit',
          is_read: false,
          created_at: subMins(12),
        },
        {
          id: 'sample-2',
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'New Lead Assigned',
          message: 'High-intent trader lead Priya Patel (₹5,00,000 capital) assigned to your desk.',
          type: 'info',
          category: 'leads',
          client_name: 'Priya Patel',
          action_tab: 'employee-dashboard',
          action_label: 'View Lead',
          is_read: false,
          created_at: subHours(1),
        },
        {
          id: 'sample-3',
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Target Milestone Reached',
          message: 'Trader Vikram Malhotra achieved daily profit target with 4 winning trades today.',
          type: 'success',
          category: 'sales',
          client_name: 'Vikram Malhotra',
          action_tab: 'active-traders',
          action_label: 'View Trader',
          is_read: true,
          created_at: subHours(3),
        },
        {
          id: 'sample-4',
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Daily Attendance Logged',
          message: 'Morning shift login recorded at 09:15 AM. You are currently marked Online.',
          type: 'info',
          category: 'system',
          is_read: true,
          created_at: subHours(5),
        },
      ] as NotificationItem[];
    }

    return list;
  }, [notifications, isAdmin, currentUser, activeTargetUserId]);

  // Category filter
  const displayedNotifications = useMemo(() => {
    return userFilteredNotifications.filter((n) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'sales') {
        return (
          n.category === 'sales' ||
          n.amount ||
          n.title.toLowerCase().includes('payment') ||
          n.title.toLowerCase().includes('credit')
        );
      }
      if (selectedCategory === 'leads') {
        return (
          n.category === 'leads' ||
          n.title.toLowerCase().includes('lead') ||
          n.title.toLowerCase().includes('trader')
        );
      }
      if (selectedCategory === 'system') {
        return (
          n.category === 'system' ||
          n.title.toLowerCase().includes('account') ||
          n.title.toLowerCase().includes('attendance') ||
          n.title.toLowerCase().includes('break')
        );
      }
      return true;
    });
  }, [userFilteredNotifications, selectedCategory]);

  // Unread count
  const activeUnreadCount = useMemo(() => {
    return userFilteredNotifications.filter((n) => !n.is_read).length;
  }, [userFilteredNotifications]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: userFilteredNotifications.length,
      sales: userFilteredNotifications.filter(
        (n) =>
          n.category === 'sales' ||
          n.amount ||
          n.title.toLowerCase().includes('payment') ||
          n.title.toLowerCase().includes('credit')
      ).length,
      leads: userFilteredNotifications.filter(
        (n) =>
          n.category === 'leads' ||
          n.title.toLowerCase().includes('lead') ||
          n.title.toLowerCase().includes('trader')
      ).length,
      system: userFilteredNotifications.filter(
        (n) =>
          n.category === 'system' ||
          n.title.toLowerCase().includes('account') ||
          n.title.toLowerCase().includes('attendance')
      ).length,
    };
  }, [userFilteredNotifications]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markNotificationRead(item.id);
    }
    if (item.action_tab && onNavigate) {
      onNavigate(item.action_tab);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    if (activeTargetUserId === 'all') {
      markAllNotificationsRead();
    } else {
      markAllNotificationsRead(activeTargetUserId);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Soft Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-slate-900/30 backdrop-blur-sm md:bg-black/10 md:backdrop-blur-none transition-opacity"
      />

      {/* Main Notification Card */}
      <div
        ref={panelRef}
        className="fixed z-[101] inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-3xl md:rounded-2xl md:inset-auto md:top-16 md:right-6 md:bottom-auto md:left-auto md:w-[410px] md:max-h-[80vh] bg-white border-t md:border border-slate-200 shadow-2xl flex flex-col font-sans overflow-hidden"
      >
        {/* Mobile Pull Handle */}
        <div
          onClick={onClose}
          className="w-full pt-2.5 pb-1 md:hidden flex items-center justify-center cursor-pointer active:opacity-60 bg-white shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Clean Header Bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            {/* Title & Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Notifications
                  </h3>
                  {activeUnreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {activeUnreadCount} new
                    </span>
                  )}
                </div>

                {/* Subtitle / Admin Selector */}
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                      className="font-medium text-slate-700 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>
                        {targetEmployee
                          ? `Viewing: ${targetEmployee.name}`
                          : activeTargetUserId === 'all'
                          ? 'All Employees'
                          : 'My Admin Alerts'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <span>Recent updates & alerts</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Mark All Read & Close */}
            <div className="flex items-center gap-1">
              {activeUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Admin Switcher Dropdown */}
          {isAdmin && isEmployeeDropdownOpen && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1 max-h-52 overflow-y-auto z-50 animate-in fade-in">
              <button
                onClick={() => {
                  setSelectedUserId(currentUser?.id || 'me');
                  setIsEmployeeDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeTargetUserId === currentUser?.id
                    ? 'bg-blue-50 text-blue-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                  My Admin Alerts
                </span>
                {activeTargetUserId === currentUser?.id && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                )}
              </button>

              <button
                onClick={() => {
                  setSelectedUserId('all');
                  setIsEmployeeDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeTargetUserId === 'all'
                    ? 'bg-blue-50 text-blue-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                  All Employees
                </span>
                {activeTargetUserId === 'all' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                )}
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedUserId(emp.id);
                      setIsEmployeeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      activeTargetUserId === emp.id
                        ? 'bg-blue-50 text-blue-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.name}</span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Clean Category Tabs */}
        <div className="p-2 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-1 shrink-0">
          {[
            { id: 'all', label: 'All', count: categoryCounts.all },
            { id: 'sales', label: 'Sales', count: categoryCounts.sales },
            { id: 'leads', label: 'Leads', count: categoryCounts.leads },
            { id: 'system', label: 'System', count: categoryCounts.system },
          ].map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/80 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white min-h-0">
          {displayedNotifications.length === 0 ? (
            /* Simple Empty State */
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
                <Bell className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No notifications</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                You are all caught up! There are no alerts in this category.
              </p>
            </div>
          ) : (
            displayedNotifications.map((n) => {
              const isSales = n.category === 'sales' || n.amount;
              const isLeads = n.category === 'leads';

              let IconComp: any = CheckCircle2;
              let iconColor = 'bg-emerald-50 text-emerald-600';

              if (isSales) {
                IconComp = DollarSign;
                iconColor = 'bg-emerald-50 text-emerald-600';
              } else if (isLeads) {
                IconComp = User;
                iconColor = 'bg-blue-50 text-blue-600';
              } else {
                IconComp = Clock;
                iconColor = 'bg-slate-100 text-slate-600';
              }

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    n.is_read
                      ? 'bg-white border-slate-100 hover:border-slate-200'
                      : 'bg-blue-50/20 border-blue-100 hover:border-blue-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Left Icon Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4
                          className={`text-xs font-semibold leading-snug truncate ${
                            n.is_read ? 'text-slate-700' : 'text-slate-900 font-bold'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">
                        {n.message}
                      </p>

                      {/* Simple Meta Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {n.amount && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₹{Number(n.amount).toLocaleString('en-IN')}
                            {n.share_percentage ? ` (${n.share_percentage}%)` : ''}
                          </span>
                        )}

                        {n.client_name && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                            Client: {n.client_name}
                          </span>
                        )}

                        {n.action_label && (
                          <span className="inline-flex items-center gap-0.5 ml-auto text-[10px] font-bold text-blue-600 hover:underline">
                            {n.action_label}
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator / delete */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        title="Dismiss"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clean Footer */}
        <div className="px-4 py-2.5 pb-4 md:pb-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{displayedNotifications.length} notifications</span>

          <div className="flex items-center gap-2">
            {activeUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Mark all read
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="md:hidden px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
