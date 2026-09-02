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
        
        {/* Responsive padding: smaller for phone, larger for desktop */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
