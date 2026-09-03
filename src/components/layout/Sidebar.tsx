import React from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ShieldCheck,
  Receipt,
  BarChart3,
  PhoneCall,
  UserCheck,
  CreditCard,
  Building2,
  Lock,
  LogOut,
  Clock,
  UserCog,
  FileSpreadsheet,
  Database,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, leads, payments, users, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  if (!currentUser) return null;

  const pendingHandoffs = leads.filter((l) => l.status === 'interested_rm_required').length;
  const pendingVerifications = payments.filter((p) => p.status === 'pending_verification').length;
  const pendingReviews = users.filter(
    (u) => u.approval_status === 'pending_admin_review' || u.role === 'pending'
  ).length;

  const role = currentUser.role;

  const getNavItems = () => {
    if (role === 'telecaller') {
      return [
        { id: 'telecaller-leads', label: 'My Assigned Leads', icon: PhoneCall },
        { id: 'public-payment-form', label: 'Submit Payment Proof', icon: CreditCard },
      ];
    }

    if (role === 'relationship_manager') {
      return [
        { id: 'rm-leads', label: 'Pipeline Handoffs', icon: UserCheck, badge: pendingHandoffs },
        { id: 'rm-traders', label: 'My Active Traders', icon: TrendingUp },
        { id: 'public-payment-form', label: 'Submit Payment Proof', icon: CreditCard },
      ];
    }

    // Admin default
    return [
      { id: 'dashboard', label: 'Admin Overview', icon: LayoutDashboard },
      { id: 'leads-management', label: 'Leads Master', icon: Users, badge: pendingHandoffs },
      { id: 'active-traders', label: 'Active Traders', icon: TrendingUp },
      { id: 'payment-verification', label: 'Payment Verification', icon: ShieldCheck, badge: pendingVerifications },
      { id: 'employee-sales', label: 'Employee Sales', icon: FileSpreadsheet },
      { id: 'employee-management', label: 'Staff & Roles', icon: UserCog, badge: pendingReviews },
      { id: 'admin-attendance', label: 'Attendance Board', icon: Clock },
      { id: 'expenses', label: 'Expenses Manager', icon: Receipt },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'public-payment-form', label: 'Public Payment Form', icon: CreditCard },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 font-sans shadow-sm">
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
                    ? 'bg-blue-550/10 text-blue-700 border border-blue-200 shadow-sm font-bold'
                    : 'text-slate-550 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
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

      {/* User Role Card & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left cursor-pointer relative group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md overflow-hidden relative">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0)
            )}
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="overflow-hidden flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{currentUser.name}</h4>
            <p className="text-[10px] font-semibold text-slate-455 capitalize font-mono">
              {currentUser.role.replace(/_/g, ' ')}
            </p>
          </div>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-none"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </aside>
  );
};
