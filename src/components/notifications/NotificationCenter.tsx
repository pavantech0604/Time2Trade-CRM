import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ShieldAlert,
  Clock,
  X,
  Trash2,
  ChevronDown,
  User,
  DollarSign,
  ArrowRight,
  Sparkles,
  Search,
  UserCheck,
  Inbox,
  AlertCircle,
  TrendingUp,
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
    clearAllNotifications,
  } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // Admin filter: can view "me", "all", or a specific employee ID
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'me');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Active user target for employee view
  const activeTargetUserId = isAdmin ? selectedUserId : currentUser?.id || '';

  // Get recipient name for admin view
  const targetEmployee = useMemo(() => {
    if (!isAdmin || activeTargetUserId === 'all') return null;
    return users.find((u) => u.id === activeTargetUserId) || null;
  }, [isAdmin, activeTargetUserId, users]);

  // Filter notifications
  const userFilteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // User isolation:
      if (!isAdmin) {
        // Regular employee sees strictly their own notifications
        return n.user_id === currentUser?.id;
      }

      // Admin logic:
      if (activeTargetUserId === 'all') {
        return true;
      }
      return n.user_id === activeTargetUserId;
    });
  }, [notifications, isAdmin, currentUser?.id, activeTargetUserId]);

  // Tab & search filters
  const displayedNotifications = useMemo(() => {
    return userFilteredNotifications.filter((n) => {
      // Unread only toggle
      if (unreadOnly && n.is_read) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'sales') {
          if (n.category !== 'sales' && !n.amount && !n.title.toLowerCase().includes('payment') && !n.title.toLowerCase().includes('credit')) {
            return false;
          }
        } else if (selectedCategory === 'leads') {
          if (n.category !== 'leads' && !n.title.toLowerCase().includes('lead') && !n.title.toLowerCase().includes('trader')) {
            return false;
          }
        } else if (selectedCategory === 'system') {
          if (n.category !== 'system' && !n.title.toLowerCase().includes('account') && !n.title.toLowerCase().includes('break')) {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesMessage = n.message.toLowerCase().includes(query);
        const matchesClient = n.client_name?.toLowerCase().includes(query);
        const matchesUser = n.user_name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage && !matchesClient && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [userFilteredNotifications, unreadOnly, selectedCategory, searchQuery]);

  // Unread count for the active target
  const activeUnreadCount = useMemo(() => {
    return userFilteredNotifications.filter((n) => !n.is_read).length;
  }, [userFilteredNotifications]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: userFilteredNotifications.length,
      sales: userFilteredNotifications.filter(
        (n) => n.category === 'sales' || n.amount || n.title.toLowerCase().includes('payment') || n.title.toLowerCase().includes('credit')
      ).length,
      leads: userFilteredNotifications.filter(
        (n) => n.category === 'leads' || n.title.toLowerCase().includes('lead') || n.title.toLowerCase().includes('trader')
      ).length,
      system: userFilteredNotifications.filter(
        (n) => n.category === 'system' || n.title.toLowerCase().includes('account')
      ).length,
    };
    return counts;
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

  const handleClearAll = () => {
    if (activeTargetUserId === 'all') {
      clearAllNotifications();
    } else {
      clearAllNotifications(activeTargetUserId);
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

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
      />

      {/* Slide-out Drawer on Mobile, Elegant Popover Card on Desktop */}
      <div
        className="fixed md:absolute right-0 top-0 md:top-full mt-0 md:mt-2 h-full md:h-auto md:max-h-[85vh] w-full sm:w-[440px] bg-white/95 md:bg-white/98 backdrop-blur-2xl border-l md:border border-slate-200/90 md:rounded-3xl shadow-2xl z-50 flex flex-col font-sans overflow-hidden animate-in slide-in-from-right md:slide-in-from-top-3 duration-200"
      >
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/80 via-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#091A2F] to-[#1E3A8A] flex items-center justify-center text-white shadow-md shadow-blue-950/20">
                <Bell className="w-4 h-4 text-[#C5A028]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#091A2F] tracking-tight">
                    Notifications
                  </h3>
                  {activeUnreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C5A028] text-black shadow-sm">
                      {activeUnreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {isAdmin
                    ? targetEmployee
                      ? `Alerts for ${targetEmployee.name}`
                      : activeTargetUserId === 'all'
                      ? 'Company-wide audit stream'
                      : 'Admin action alerts'
                    : 'Personal alerts & staff credits'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {userFilteredNotifications.length > 0 && (
                <>
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearAll}
                    title="Clear notifications"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin Employee Switcher */}
          {isAdmin && (
            <div className="mt-3 relative">
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-slate-400">View Employee:</span>
                  <span className="font-semibold text-slate-800 truncate">
                    {targetEmployee
                      ? `${targetEmployee.name} (${targetEmployee.designation || 'Staff'})`
                      : activeTargetUserId === 'all'
                      ? 'All Employees (Company Stream)'
                      : `My Admin Notices (${currentUser?.name})`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {isEmployeeDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setSelectedUserId(currentUser?.id || 'me');
                      setIsEmployeeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeTargetUserId === currentUser?.id
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      My Admin Notices
                    </span>
                    {activeTargetUserId === currentUser?.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedUserId('all');
                      setIsEmployeeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeTargetUserId === 'all'
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-blue-600" />
                      All Employees (Company Stream)
                    </span>
                    {activeTargetUserId === 'all' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Staff Members
                  </div>

                  {users
                    .filter((u) => u.id !== currentUser?.id)
                    .map((emp) => {
                      const empNotifCount = notifications.filter(
                        (n) => n.user_id === emp.id && !n.is_read
                      ).length;

                      return (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setSelectedUserId(emp.id);
                            setIsEmployeeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                            activeTargetUserId === emp.id
                              ? 'bg-amber-50 text-amber-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{emp.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">
                              ({emp.designation || emp.role})
                            </span>
                          </div>
                          {empNotifCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                              {empNotifCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Interactive Category Tabs */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All', count: categoryCounts.all },
              { id: 'sales', label: 'Credits & Sales', count: categoryCounts.sales },
              { id: 'leads', label: 'Leads', count: categoryCounts.leads },
              { id: 'system', label: 'System', count: categoryCounts.system },
            ].map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#091A2F] text-white shadow-sm'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Unread filter */}
          <div className="flex items-center gap-2 mt-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, clients, amounts..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                unreadOnly
                  ? 'bg-amber-500/10 border-amber-300 text-amber-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  unreadOnly ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>Unread</span>
            </button>
          </div>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[60vh] md:max-h-[500px]">
          {displayedNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">All Caught Up!</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery || unreadOnly
                  ? 'No notifications match your current filter criteria.'
                  : targetEmployee
                  ? `No notifications for ${targetEmployee.name} at this time.`
                  : 'There are no notifications in this view.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((n) => {
              const isSuccess = n.type === 'success';
              const isWarning = n.type === 'warning';
              const isDanger = n.type === 'danger';

              // Visual styling per notification type
              let cardBg = 'bg-slate-50/40 border-slate-200/80';
              let iconBg = 'bg-blue-50 text-blue-600 border-blue-200';
              let IconComp: any = Bell;

              if (isSuccess) {
                cardBg = n.is_read
                  ? 'bg-emerald-50/20 border-emerald-100'
                  : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 shadow-sm';
                iconBg = 'bg-emerald-100/80 text-emerald-700 border-emerald-300';
                IconComp = CheckCircle2;
              } else if (isWarning) {
                cardBg = n.is_read
                  ? 'bg-amber-50/20 border-amber-100'
                  : 'bg-amber-50/50 border-amber-200 hover:border-amber-300 shadow-sm';
                iconBg = 'bg-amber-100/80 text-amber-700 border-amber-300';
                IconComp = ShieldAlert;
              } else if (isDanger) {
                cardBg = n.is_read
                  ? 'bg-rose-50/20 border-rose-100'
                  : 'bg-rose-50/50 border-rose-200 hover:border-rose-300 shadow-sm';
                iconBg = 'bg-rose-100/80 text-rose-700 border-rose-300';
                IconComp = AlertCircle;
              } else if (n.category === 'leads') {
                IconComp = TrendingUp;
                iconBg = 'bg-sky-100/80 text-sky-700 border-sky-300';
              }

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${cardBg} ${
                    n.is_read ? 'opacity-70 hover:opacity-100' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${iconBg}`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4
                          className={`text-xs font-bold leading-tight truncate ${
                            n.is_read ? 'text-slate-600' : 'text-[#091A2F]'
                          }`}
                        >
                          {n.title}
                        </h4>
                        <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed break-words">
                        {n.message}
                      </p>

                      {/* Highlight Chips (Amount, Share, Client) */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {n.amount && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                            <DollarSign className="w-2.5 h-2.5" />
                            ₹{Number(n.amount).toLocaleString('en-IN')}
                            {n.share_percentage ? ` (${n.share_percentage}%)` : ''}
                          </span>
                        )}

                        {n.client_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Client: {n.client_name}
                          </span>
                        )}

                        {isAdmin && n.user_name && activeTargetUserId === 'all' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            To: {n.user_name}
                          </span>
                        )}

                        {n.action_label && (
                          <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold text-amber-700 group-hover:text-amber-800 hover:underline">
                            {n.action_label}
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Unread Indicator & Delete on Hover */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        title="Dismiss"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info Bar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>
            {displayedNotifications.length} of {userFilteredNotifications.length} items shown
          </span>
          <span className="text-[10px]">Time2Trade Real-time</span>
        </div>
      </div>
    </>
  );
};
