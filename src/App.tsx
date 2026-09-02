import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { AdminOverview } from './components/admin/AdminOverview';
import { LeadsManagement } from './components/admin/LeadsManagement';
import { ActiveTradersView } from './components/admin/ActiveTradersView';
import { PaymentVerification } from './components/admin/PaymentVerification';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { AttendanceDashboard } from './components/admin/AttendanceDashboard';
import { ExpenseModule } from './components/admin/ExpenseModule';
import { ReportsModule } from './components/admin/ReportsModule';
import { TelecallerDashboard } from './components/telecaller/TelecallerDashboard';
import { TelecallerLeadsPhoto } from './components/telecaller/TelecallerLeadsPhoto';
import { RMDashboard } from './components/rm/RMDashboard';
import { PublicPaymentForm } from './components/payments/PublicPaymentForm';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { PendingApprovalPage } from './components/auth/PendingApprovalPage';
import { Loader2, Building2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'signup' | 'pending'>('login');

  // Handle role defaults when authenticating or switching
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'telecaller') {
      setActiveTab('telecaller-leads');
    } else if (currentUser.role === 'relationship_manager') {
      setActiveTab('rm-leads');
    } else if (currentUser.role === 'admin') {
      setActiveTab('dashboard');
    }
  }, [currentUser?.role]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 font-sans space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-teal-500 flex items-center justify-center shadow-xl shadow-blue-500/20 animate-pulse">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
          <span>Authenticating session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated -> Render appropriate Auth screen
  if (!currentUser) {
    if (authView === 'signup') {
      return (
        <SignupPage
          onNavigateToLogin={() => setAuthView('login')}
          onSignupSuccess={() => setAuthView('pending')}
        />
      );
    }

    if (authView === 'pending') {
      return <PendingApprovalPage onBackToLogin={() => setAuthView('login')} />;
    }

    return (
      <LoginPage
        onNavigateToSignup={() => setAuthView('signup')}
        onNavigateToPending={() => setAuthView('pending')}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      // Admin Views
      case 'dashboard':
        return <AdminOverview onNavigate={setActiveTab} />;
      case 'leads-management':
        return <LeadsManagement />;
      case 'active-traders':
        return <ActiveTradersView />;
      case 'payment-verification':
        return <PaymentVerification />;
      case 'employee-management':
        return <EmployeeManagement />;
      case 'admin-attendance':
        return <AttendanceDashboard />;
      case 'expenses':
        return <ExpenseModule />;
      case 'reports':
        return <ReportsModule />;

      // Telecaller View
      case 'telecaller-leads':
        return <TelecallerDashboard />;
      case 'telecaller-leads-photo':
        return <TelecallerLeadsPhoto />;

      // RM Views
      case 'rm-leads':
        return <RMDashboard activeTab="rm-leads" />;
      case 'rm-traders':
        return <RMDashboard activeTab="rm-traders" />;

      // Payment Submission Portal
      case 'public-payment-form':
        return (
          <PublicPaymentForm
            onBack={() => {
              if (currentUser.role === 'telecaller') setActiveTab('telecaller-leads');
              else if (currentUser.role === 'relationship_manager') setActiveTab('rm-leads');
              else setActiveTab('dashboard');
            }}
          />
        );

      default:
        if (currentUser.role === 'telecaller') return <TelecallerDashboard />;
        if (currentUser.role === 'relationship_manager') return <RMDashboard activeTab="rm-leads" />;
        return <AdminOverview onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenPaymentForm={() => setActiveTab('public-payment-form')}
    >
      {renderContent()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
