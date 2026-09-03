import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ShieldCheck,
  Receipt,
  PhoneCall,
  UserCheck,
  CreditCard,
  Clock,
  UserCog,
  FileSpreadsheet,
  Database,
  Camera,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BackgroundEffects } from '../common/BackgroundEffects';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPaymentForm?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onOpenPaymentForm,
}) => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (!currentUser) return <>{children}</>;

  const role = currentUser.role;

  // Bottom navigation items for mobile screens
  const getMobileNavItems = () => {
    let items = [];
    if (role === 'telecaller') {
      items = [
        { id: 'telecaller-leads', label: 'Leads', icon: PhoneCall },
        { id: 'public-payment-form', label: 'Pay Proof', icon: CreditCard },
      ];
    } else if (role === 'relationship_manager') {
      items = [
        { id: 'rm-leads', label: 'Handoffs', icon: UserCheck },
        { id: 'rm-traders', label: 'Traders', icon: TrendingUp },
        { id: 'public-payment-form', label: 'Submit Pay', icon: CreditCard },
      ];
    } else {
      // Admin default
      items = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'employee-sales', label: 'Emp Sales', icon: FileSpreadsheet },
        { id: 'employee-management', label: 'Staff', icon: UserCog },
        { id: 'admin-attendance', label: 'Shifts', icon: Clock },
      ];
    }
    return [...items, { id: 'mobile-menu', label: 'More Menu', icon: Menu }];
  };

  const mobileNavItems = getMobileNavItems();

  return (
    <div className="h-screen w-screen bg-[#FAF8F5] text-slate-800 flex flex-col md:flex-row font-sans antialiased selection:bg-[#C5A028] selection:text-black relative overflow-hidden">
      <BackgroundEffects />
      {/* Sidebar for tablet & desktop */}
      <div className="hidden md:flex shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Mobile Drawer Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white h-full border-r border-slate-200 shadow-2xl animate-in slide-in-from-left duration-200 z-50">
            {/* Close button inside drawer */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-550 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header 
          onOpenPaymentForm={onOpenPaymentForm} 
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        
        {/* Responsive padding: mobile-first optimized with bottom navbar offset */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          {children}
        </main>

        {/* Mobile-First Native Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 py-1.5 px-2 flex items-center justify-around shadow-2xl safe-area-bottom">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isMenuTrigger = item.id === 'mobile-menu';
            const isActive = !isMenuTrigger && activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isMenuTrigger) {
                    setIsMobileMenuOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 rounded-2xl transition-all cursor-pointer relative active:scale-95 ${
                  isActive
                    ? 'text-blue-700 font-bold bg-blue-50/80 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : 'text-slate-400'}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black text-blue-700' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
