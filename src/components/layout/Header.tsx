import React, { useState } from 'react';
import {
  Bell,
  CreditCard,
  ChevronDown,
  Coffee,
  Utensils,
  CheckCircle2,
  Moon,
  Clock,
  LogOut,
  ShieldAlert,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserPresenceStatus } from '../../types';

interface HeaderProps {
  onOpenPaymentForm?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPaymentForm, onToggleMobileMenu }) => {
  const {
    currentUser,
    notifications,
    markNotificationRead,
    currentPresence,
    updateUserPresence,
    logout,
  } = useAuth();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const statusConfig: Record<
    UserPresenceStatus,
    { label: string; bg: string; text: string; dot: string; icon: any }
  > = {
    online: {
      label: 'Online',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    on_break: {
      label: 'On Break',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
      icon: Coffee,
    },
    on_lunch: {
      label: 'On Lunch',
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
      icon: Utensils,
    },
    offline: {
      label: 'Offline',
      bg: 'bg-slate-50 border-slate-200',
      text: 'text-slate-700',
      dot: 'bg-slate-500',
      icon: Moon,
    },
  };

  const currentStatus = currentPresence?.current_status || 'online';
  const currentConfig = statusConfig[currentStatus] || statusConfig.online;

  const handleStatusChange = (newStatus: UserPresenceStatus) => {
    if (newStatus === currentStatus) {
      setIsStatusOpen(false);
      return;
    }

    updateUserPresence(newStatus);
    setIsStatusOpen(false);

    let msg = 'You are back online.';
    if (newStatus === 'on_break') msg = 'You are now on break. Break timer started.';
    else if (newStatus === 'on_lunch') msg = 'You are on lunch break. Lunch timer started.';
    else if (newStatus === 'offline') msg = 'You are now marked offline.';

    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast(null);
    }, 4000);
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
      {/* Toast Alert on Status Change */}
      {statusToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white border border-blue-200 text-blue-800 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="font-semibold">{statusToast}</span>
        </div>
      )}

      {/* Premium Workspace Context Badge */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Toggle */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
            title="Open Sidebar Navigation"
          >
            <Menu className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* Dynamic Glowing Workspace Badge */}
        {(() => {
          let badgeText = 'Workspace';
          let mobileBadgeText = 'Workspace';
          let colorStyle = 'from-blue-600 to-indigo-600 shadow-blue-500/10';
          let textColor = 'text-blue-700 bg-blue-50 border-blue-200';
          
          if (currentUser?.role === 'admin') {
            badgeText = 'Command Centre';
            mobileBadgeText = 'Admin';
            colorStyle = 'from-slate-900 to-slate-800 shadow-slate-900/10';
            textColor = 'text-slate-800 bg-slate-100 border-slate-200';
          } else if (currentUser?.role === 'employee') {
            badgeText = 'Trading Operations';
            mobileBadgeText = 'Employee';
            colorStyle = 'from-blue-600 to-indigo-600 shadow-blue-500/10';
            textColor = 'text-blue-700 bg-blue-50 border-blue-200';
          }

          return (
            <div className="flex items-center gap-1.5 font-sans">
              {/* Premium abstract glowing dot */}
              <div className={`w-2 h-2 rounded-full bg-gradient-to-tr ${colorStyle} animate-pulse shrink-0`} />
              
              <span className={`px-2 py-0.5 rounded-lg border text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider ${textColor} flex items-center`}>
                <span className="hidden sm:inline">{badgeText}</span>
                <span className="sm:hidden">{mobileBadgeText}</span>
              </span>
            </div>
          );
        })()}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Real-time Employee Presence Status Dropdown (Hidden for Admin) */}
        {currentUser?.role !== 'admin' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${currentConfig.bg} ${currentConfig.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${currentConfig.dot} animate-pulse`} />
              <span>{currentConfig.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isStatusOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Work Status Tracker
                </div>
                <div className="py-1 space-y-1">
                  {(['online', 'on_break', 'on_lunch'] as UserPresenceStatus[]).map((st) => {
                    const cfg = statusConfig[st];
                    const Icon = cfg.icon;
                    const isSelected = currentStatus === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot.replace(/bg-emerald-400/g, 'bg-emerald-500').replace(/bg-amber-400/g, 'bg-amber-500').replace(/bg-purple-400/g, 'bg-purple-500')}`} />
                          <span>{cfg.label}</span>
                        </div>
                        <Icon className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    );
                  })}
                </div>

                {/* Today's break summary */}
                {currentPresence && (
                  <div className="mt-1 pt-2 border-t border-slate-100 px-3 py-1 text-[11px] text-slate-555 space-y-0.5 font-sans">
                    <div className="flex justify-between">
                      <span>Break Today:</span>
                      <span className="font-bold text-amber-700">
                        {currentPresence.total_break_minutes}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lunch Today:</span>
                      <span className="font-bold text-purple-700">
                        {currentPresence.total_lunch_minutes}m
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Payment Submission Action */}
        {onOpenPaymentForm && (
          <button
            onClick={onOpenPaymentForm}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-300 text-xs font-semibold hover:bg-emerald-50 transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-650" />
            <span>Submit Payment</span>
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-xs font-bold text-[#091A2F] font-mono uppercase tracking-wider">
                  Notifications
                </h4>
                <span className="text-[10px] font-bold text-[#C5A028] bg-[#C5A028]/10 px-2 py-0.5 rounded-full font-mono">
                  {unreadCount} unread
                </span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No new notifications
                  </p>
                ) : (
                  notifications.map((n) => {
                    const isWarning = n.type === 'warning';
                    return (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                          n.is_read
                            ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:bg-slate-50'
                            : isWarning
                            ? 'bg-amber-50/40 border-amber-200/60 hover:bg-amber-50/70 hover:border-amber-300'
                            : 'bg-blue-50/40 border-blue-200/60 hover:bg-blue-50/70 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {n.is_read ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            ) : isWarning ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            ) : (
                              <Bell className="w-3.5 h-3.5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className={`text-xs font-bold ${n.is_read ? 'text-slate-500' : 'text-[#091A2F]'}`}>
                              {n.title}
                            </h5>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 mt-1 block font-mono">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile-Only Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="md:hidden p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer hover:bg-rose-100"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
