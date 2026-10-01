import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ShieldCheck,
  Receipt,
  BarChart3,
  CreditCard,
  LogOut,
  Clock,
  UserCog,
  FileSpreadsheet,
  Target,
  MessageSquare,
  Banknote,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, className = '' }) => {
  const { currentUser, payments, users, logout } = useAuth();

  if (!currentUser) return null;

  const pendingVerifications = payments.filter((p) => p.status === 'pending_verification').length;
  const pendingReviews = users.filter(
    (u) =>
      u.approval_status === 'pending_admin_review' ||
      (u.role === 'pending' && u.approval_status !== 'rejected' && u.approval_status !== 'approved')
  ).length;

  const role = currentUser.role;

  const getNavItems = () => {
    if (role === 'employee') {
      return [
        { id: 'employee-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'monthly-sales', label: 'Monthly Sales', icon: CalendarDays },
        { id: 'team-chat', label: 'Team Chat', icon: MessageSquare },
        { id: 'public-payment-form', label: 'Submit Payment Proof', icon: CreditCard },
      ];
    }

    if (role === 'manager') {
      return [
        { id: 'manager-dashboard', label: 'Manager Overview', icon: LayoutDashboard },
        { id: 'monthly-sales', label: 'Monthly Sales', icon: CalendarDays },
        { id: 'employee-sales', label: 'Employee Sales', icon: FileSpreadsheet },
        { id: 'employee-scorecards', label: 'Employee Scorecards', icon: Target },
        { id: 'active-traders', label: 'Active Traders', icon: TrendingUp },
        { id: 'team-chat', label: 'Team Chat & Sales', icon: MessageSquare },
        { id: 'public-payment-form', label: 'Submit Payment Proof', icon: CreditCard },
      ];
    }

    // Admin default
    return [
      { id: 'dashboard', label: 'Admin Overview', icon: LayoutDashboard },
      { id: 'monthly-sales', label: 'Monthly Sales', icon: CalendarDays },
      { id: 'employee-sales', label: 'Employee Sales', icon: FileSpreadsheet },
      { id: 'team-chat', label: 'Team Chat & Sales', icon: MessageSquare },
      { id: 'employee-scorecards', label: 'Employee Scorecards', icon: Target },
      { id: 'active-traders', label: 'Active Traders', icon: TrendingUp },
      { id: 'payment-verification', label: 'Payment Verification', icon: ShieldCheck, badge: pendingVerifications },
      { id: 'employee-management', label: 'Staff & Roles', icon: UserCog, badge: pendingReviews },
      { id: 'admin-attendance', label: 'Attendance Board', icon: Clock },
      { id: 'expenses', label: 'Expenses Manager', icon: Receipt },
      { id: 'manager-advances', label: 'Manager Advances', icon: Banknote },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'public-payment-form', label: 'Public Payment Form', icon: CreditCard },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside
      role="navigation"
      aria-label="Main sidebar navigation"
      className={`w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 font-sans shadow-sm ${className}`}
    >
      {/* Scrollable Navigation Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-center shrink-0">
          <img src="/logo-tight.png" alt="Time2Trade Logo" className="h-12 w-auto object-contain shrink-0 drop-shadow-sm" />
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            {role.replace(/_/g, ' ')} Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-700 border border-blue-200 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {typeof item.badge !== 'undefined' && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 animate-pulse font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign Out Action in Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
        <button
          onClick={logout}
          aria-label="Sign Out"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50/70 border border-slate-200/80 hover:border-rose-200 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
