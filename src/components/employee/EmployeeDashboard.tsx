import React, { useState } from 'react';
import { useAuth, isBhavaniUser } from '../../context/AuthContext';
import { 
  Users, 
  TrendingUp, 
  PhoneCall,
  Plus,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Phone,
  Calendar,
  Wallet,
  AlertCircle,
  X,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  CreditCard,
  Star,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Award,
  Sparkles,
  ArrowUpDown,
  Layers,
  UserCheck,
  Clock,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { LeadStatus } from '../../types';

export const EmployeeDashboard: React.FC = () => {
  const {
    currentUser,
    leads,
    traders,
    payments,
    addLead,
    convertLeadToTrader,
    mustResetPassword,
    setMustResetPassword,
    refreshLivePayments,
    isLiveSyncing,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'traders' | 'primary-payments' | 'shared-payments' | 'payments' | 'leads'>('traders');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'amount-desc' | 'amount-asc'>('date-desc');
  
  // Toast State
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const resolveClientContact = (payment: any) => {
    let name = (payment.client_name || payment.trader_name || '').trim();
    let phone = (payment.client_phone || payment.trader_phone || '').trim();
    let proofUrl = payment.screenshot_url || '';

    if ((!name || name.toLowerCase() === 'client' || name.toLowerCase() === 'direct client') || !phone) {
      const matched = traders.find((t) => 
        (payment.trader_id && t.id === payment.trader_id) ||
        (phone && t.phone && t.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );
      if (matched) {
        if (!name || name.toLowerCase() === 'client' || name.toLowerCase() === 'direct client') name = matched.name;
        if (!phone) phone = matched.phone;
      }
    }

    if (typeof payment.remarks === 'string') {
      if (!name || name.toLowerCase() === 'client' || name.toLowerCase() === 'direct client') {
        const nameMatch = payment.remarks.match(/(?:Client|Name|Client Name)\s*:\s*([^\n;,]+)/i);
        if (nameMatch) name = nameMatch[1].trim();
      }
      if (!phone) {
        const phoneMatch = payment.remarks.match(/(?:Phone|Mobile|Contact)\s*:\s*([0-9\+\s-]{10,14})/i);
        if (phoneMatch) phone = phoneMatch[1].replace(/\D/g, '').slice(-10);
      }
      if (!proofUrl) {
        const proofMatch = payment.remarks.match(/Proof URL:\s*(https?:\/\/[^\s\n]+)/i);
        if (proofMatch) proofUrl = proofMatch[1].trim();
      }
    }

    return {
      displayName: name || 'Client',
      displayPhone: phone,
      proofUrl,
    };
  };
  
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    phone: '',
    status: 'callback_requested' as LeadStatus,
    notes: ''
  });

  const [convertData, setConvertData] = useState({
    initialCapital: '',
    selectedService: '',
    preferredMarket: ''
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  // Check if current logged-in employee is Bhavani
  const isCurrentBhavani = isBhavaniUser(currentUser);

  // Robust Employee Matching across ID, Name, Email, and Remarks
  const isEmployeeMatch = (empId?: string, empName?: string, empEmail?: string, remarks?: string) => {
    if (!currentUser) return false;

    // If logged in as Bhavani, match any Bhavani/Bavani variant
    if (isCurrentBhavani) {
      if (isBhavaniUser(empId) || isBhavaniUser(empName) || isBhavaniUser(empEmail) || isBhavaniUser(remarks)) {
        return true;
      }
    }

    const curId = (currentUser.id || '').toLowerCase().trim();
    const curName = (currentUser.name || '').toLowerCase().trim();
    const curEmail = (currentUser.email || '').toLowerCase().trim();
    const curFirstName = curName.split(' ')[0].replace(/[^a-z0-9]/g, '');

    if (empId && empId.toLowerCase().trim() === curId) return true;
    if (empEmail && empEmail.toLowerCase().trim() === curEmail) return true;

    if (empName) {
      const cleanName = empName.toLowerCase().replace(/\s*\(primary\)/i, '').trim();
      const cleanFirstName = cleanName.split(' ')[0].replace(/[^a-z0-9]/g, '');
      if (cleanName === curName) return true;
      if (cleanName.includes(curName) || curName.includes(cleanName)) return true;
      if (curFirstName && curFirstName.length >= 3 && cleanFirstName === curFirstName) return true;
    }

    if (remarks && curName) {
      const lowerRemarks = remarks.toLowerCase();
      if (lowerRemarks.includes(curName) || (curFirstName && curFirstName.length >= 3 && lowerRemarks.includes(curFirstName))) {
        return true;
      }
    }

    return false;
  };

  const isMyTraderPayment = (p: any) => {
    if (!currentUser) return false;
    if (p.trader_id) {
      const t = traders.find((tr) => tr.id === p.trader_id);
      if (t && (t.employee_id === currentUser.id || isEmployeeMatch(t.employee_id, t.employee_name))) return true;
    }
    const cleanPhone = (p.client_phone || p.trader_phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      const t = traders.find(
        (tr) =>
          (tr.phone || '').replace(/\D/g, '') === cleanPhone &&
          (tr.employee_id === currentUser.id || isEmployeeMatch(tr.employee_id, tr.employee_name))
      );
      if (t) return true;
    }
    return false;
  };

  // Derived Data: All payments where current employee is primary, submitting, or shared recipient
  const myLeads = leads.filter((l) => l.assigned_to === currentUser.id && l.status !== 'active_trader');

  const myPayments = payments.filter((p) => {
    const isDirect =
      isEmployeeMatch(p.employee_id, p.employee_name, undefined, p.remarks) ||
      isEmployeeMatch(p.submitted_by_employee_id, p.submitted_by_employee_name, undefined, p.remarks);
    const isAllocated = p.allocations?.some((a) =>
      isEmployeeMatch(a.employee_id, a.employee_name, a.employee_email)
    );
    const isTraderMatch = isMyTraderPayment(p);
    return isDirect || isAllocated || isTraderMatch;
  });

  const getMyCreditedAmount = (p: typeof payments[0]) => {
    if (p.allocations && p.allocations.length > 0) {
      const myAlloc = p.allocations.find((a) =>
        isEmployeeMatch(a.employee_id, a.employee_name, a.employee_email)
      );
      if (myAlloc && Number(myAlloc.allocation_amount) > 0) {
        return Number(myAlloc.allocation_amount);
      }
    }
    const isDirect =
      isEmployeeMatch(p.employee_id, p.employee_name, undefined, p.remarks) ||
      isEmployeeMatch(p.submitted_by_employee_id, p.submitted_by_employee_name, undefined, p.remarks) ||
      isMyTraderPayment(p);
    return isDirect ? Number(p.amount) || 0 : 0;
  };

  const isPrimaryPayment = (p: typeof payments[0]) => {
    if (p.allocations && p.allocations.length > 0) {
      if (
        p.allocations.length === 1 &&
        isEmployeeMatch(p.allocations[0].employee_id, p.allocations[0].employee_name, p.allocations[0].employee_email)
      ) {
        return true;
      }
      const myAlloc = p.allocations.find((a) =>
        isEmployeeMatch(a.employee_id, a.employee_name, a.employee_email)
      );
      if (myAlloc?.is_primary || Number(myAlloc?.allocation_percentage) >= 100) return true;
    }
    if (!p.is_shared && (!p.allocations || p.allocations.length <= 1)) {
      if (isEmployeeMatch(p.employee_id, p.employee_name, undefined, p.remarks)) return true;
    }
    return false;
  };

  const isSharedPayment = (p: typeof payments[0]) => {
    return Boolean(p.is_shared || (p.allocations && p.allocations.length > 1));
  };

  const primaryPayments = myPayments.filter((p) => isPrimaryPayment(p));
  const sharedPayments = myPayments.filter((p) => isSharedPayment(p) && !isPrimaryPayment(p));

  const [paymentSubFilter, setPaymentSubFilter] = useState<'all' | 'direct' | 'shared' | 'approved' | 'pending'>('all');

  // Synthesized Clients / Traders list with number of payments made by each client
  const myClients = React.useMemo(() => {
    const clientMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        serviceCategory: string;
        serviceType: string;
        subscriptionDuration: string;
        totalPaymentsCount: number;
        approvedPaymentsCount: number;
        pendingPaymentsCount: number;
        totalPaidAmount: number;
        myCreditedAmount: number;
        latestPaymentDate: string;
        latestStatus: string;
        payments: typeof myPayments;
        traderDetails?: any;
      }
    >();

    myPayments.forEach((p) => {
      const { displayName, displayPhone } = resolveClientContact(p);
      const key = (displayPhone ? displayPhone.replace(/\D/g, '').slice(-10) : '') || displayName.toLowerCase().trim();
      if (!key) return;

      const pAmount = Number(p.amount) || 0;
      const credited = getMyCreditedAmount(p);
      const pDate = p.transaction_time || p.created_at || new Date().toISOString();
      const existing = clientMap.get(key);

      if (!existing) {
        clientMap.set(key, {
          id: p.trader_id || `client-${key}`,
          name: displayName,
          phone: displayPhone,
          serviceCategory: p.service_category || 'Equity',
          serviceType: p.service_type || 'Option',
          subscriptionDuration: p.subscription_duration || '',
          totalPaymentsCount: 1,
          approvedPaymentsCount: p.status === 'approved' ? 1 : 0,
          pendingPaymentsCount: p.status === 'pending_verification' ? 1 : 0,
          totalPaidAmount: pAmount,
          myCreditedAmount: credited,
          latestPaymentDate: pDate,
          latestStatus: p.status,
          payments: [p],
        });
      } else {
        existing.totalPaymentsCount += 1;
        if (p.status === 'approved') existing.approvedPaymentsCount += 1;
        if (p.status === 'pending_verification') existing.pendingPaymentsCount += 1;
        existing.totalPaidAmount += pAmount;
        existing.myCreditedAmount += credited;
        existing.payments.push(p);
        if (new Date(pDate).getTime() > new Date(existing.latestPaymentDate).getTime()) {
          existing.latestPaymentDate = pDate;
          existing.latestStatus = p.status;
        }
      }
    });

    traders.forEach((t) => {
      if (t.employee_id === currentUser?.id || isEmployeeMatch(t.employee_id, t.employee_name)) {
        const key = (t.phone ? t.phone.replace(/\D/g, '').slice(-10) : '') || t.name.toLowerCase().trim();
        if (!key) return;
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: t.id,
            name: t.name,
            phone: t.phone,
            serviceCategory: t.preferred_market || 'Equity',
            serviceType: t.selected_service || 'Option',
            subscriptionDuration: '',
            totalPaymentsCount: 0,
            approvedPaymentsCount: 0,
            pendingPaymentsCount: 0,
            totalPaidAmount: Number(t.initial_capital) || 0,
            myCreditedAmount: 0,
            latestPaymentDate: t.joined_at || t.created_at || new Date().toISOString(),
            latestStatus: 'active',
            payments: [],
            traderDetails: t,
          });
        } else {
          clientMap.get(key)!.traderDetails = t;
        }
      }
    });

    return Array.from(clientMap.values()).sort(
      (a, b) => new Date(b.latestPaymentDate).getTime() - new Date(a.latestPaymentDate).getTime()
    );
  }, [myPayments, traders, currentUser]);

  const filteredClients = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return myClients;
    return myClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.serviceCategory.toLowerCase().includes(q) ||
        c.serviceType.toLowerCase().includes(q)
    );
  }, [myClients, searchQuery]);

  const filteredLeads = myLeads.filter(
    (l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery)
  );

  const filteredPayments = React.useMemo(() => {
    let list = myPayments;

    if (paymentSubFilter === 'direct') {
      list = primaryPayments;
    } else if (paymentSubFilter === 'shared') {
      list = sharedPayments;
    } else if (paymentSubFilter === 'approved') {
      list = list.filter((p) => p.status === 'approved');
    } else if (paymentSubFilter === 'pending') {
      list = list.filter((p) => p.status === 'pending_verification');
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const { displayName, displayPhone } = resolveClientContact(p);
        return (
          displayName.toLowerCase().includes(q) ||
          displayPhone.includes(q) ||
          p.utr.toLowerCase().includes(q) ||
          (p.service_category || '').toLowerCase().includes(q) ||
          (p.service_type || '').toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      if (sortOrder === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortOrder === 'amount-asc') return Number(a.amount) - Number(b.amount);
      const dateA = new Date(a.transaction_time || a.created_at || 0).getTime();
      const dateB = new Date(b.transaction_time || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [myPayments, primaryPayments, sharedPayments, activeTab, paymentSubFilter, searchQuery, sortOrder]);

  const approvedPayments = myPayments.filter((p) => p.status === 'approved');
  const pendingPayments = myPayments.filter((p) => p.status === 'pending_verification');

  // Sales totals (both approved and overall including review)
  const totalApprovedSales = approvedPayments.reduce((sum, p) => sum + getMyCreditedAmount(p), 0);
  const totalPendingSales = pendingPayments.reduce((sum, p) => sum + getMyCreditedAmount(p), 0);
  const totalOverallSales = totalApprovedSales + totalPendingSales;

  const primaryApprovedSales = primaryPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + getMyCreditedAmount(p), 0);
  const primaryOverallSales = primaryPayments.reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

  const sharedApprovedSales = sharedPayments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + getMyCreditedAmount(p), 0);
  const sharedOverallSales = sharedPayments.reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.name || !newLeadData.phone) return;
    
    try {
      await addLead({
        name: newLeadData.name,
        phone: newLeadData.phone,
        status: newLeadData.status,
        notes: newLeadData.notes,
        source: 'manual_entry',
        assigned_to: currentUser.id,
      });
      setIsAddLeadModalOpen(false);
      setNewLeadData({ name: '', phone: '', status: 'callback_requested', notes: '' });
      showToast('Lead added successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add lead', 'error');
    }
  };

  const handleConvertToTraderClick = (leadId: string) => {
    setConvertingLeadId(leadId);
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLeadId || !convertData.initialCapital) return;

    try {
      await convertLeadToTrader(convertingLeadId, currentUser.id, {
        initialCapital: Number(convertData.initialCapital),
        selectedService: convertData.selectedService,
        preferredMarket: convertData.preferredMarket
      });
      showToast('Lead successfully converted to Active Trader!', 'success');
      setIsConvertModalOpen(false);
      setConvertData({ initialCapital: '', selectedService: '', preferredMarket: '' });
      setActiveTab('traders'); // Automatically switch to traders tab for better UX
    } catch (err: any) {
      showToast(err.message || 'Failed to convert lead', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Interactive Temporary Password Alert Banner */}
      {Boolean(currentUser?.must_reset_password || mustResetPassword) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-indigo-500/10 border border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <KeyRound className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base">Temporary Password Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-mono uppercase font-bold">Action Required</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                You logged in with a temporary key (<span className="font-mono font-bold text-blue-700">T2T@...</span>). Set your permanent password to secure your desk and avoid sign-in interruptions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMustResetPassword(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Set Permanent Password</span>
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-800">
            Welcome back, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Here's what's happening with your pipeline today.
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={() => setIsAddLeadModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Warm Lead
          </button>
        </div>
      </div>

      {/* Interactive Milestone Spotlight Banner for High-Ticket Deals (e.g. Bhavani's ₹10,00,000 Solo Deal) */}
      {primaryPayments.some((p) => Number(p.amount) >= 500000) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                  Mega Milestone: ₹10,00,000 Solo Deal
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-mono uppercase font-black">
                  100% Credited
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Client <strong className="text-slate-800">Gopinath</strong> • Equity - Stock Option (Yearly) • UTR: <span className="font-mono font-bold text-slate-700">01236579942</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPaymentSubFilter('direct');
              setActiveTab('payments');
              setSearchQuery('Gopinath');
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95 flex items-center justify-center gap-2"
          >
            <span>View Solo Deal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Total Sales Volume"
          value={totalOverallSales}
          subtitle={
            totalPendingSales > 0
              ? `₹${totalApprovedSales.toLocaleString('en-IN')} Approved • ₹${totalPendingSales.toLocaleString('en-IN')} Review`
              : `${myPayments.length} Total Payment${myPayments.length === 1 ? '' : 's'}`
          }
          icon={Wallet}
          variant="positive"
          isCurrency={true}
          onClick={() => {
            setPaymentSubFilter('all');
            setActiveTab('payments');
          }}
        />
        <MetricCard
          title="Primary (Solo) Sales"
          value={primaryOverallSales}
          subtitle={`${primaryPayments.length} Solo Deal${primaryPayments.length === 1 ? '' : 's'} (100% Credited)`}
          icon={Star}
          variant="info"
          isCurrency={true}
          onClick={() => {
            setPaymentSubFilter('direct');
            setActiveTab('payments');
          }}
        />
        <MetricCard
          title="Shared Sales Received"
          value={sharedOverallSales}
          subtitle={`${sharedPayments.length} Shared Deal${sharedPayments.length === 1 ? '' : 's'}`}
          icon={TrendingUp}
          variant="neutral"
          isCurrency={true}
          onClick={() => {
            setPaymentSubFilter('shared');
            setActiveTab('payments');
          }}
        />
        <MetricCard
          title="My Traders (Clients)"
          value={myClients.length.toString()}
          subtitle={`${myPayments.length} Payments from ${myClients.length} Clients`}
          icon={Users}
          variant="positive"
          isCurrency={false}
          onClick={() => setActiveTab('traders')}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[520px]">
        {/* Navigation Tabs and Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl overflow-x-auto no-scrollbar whitespace-nowrap max-w-full">
            <button
              onClick={() => setActiveTab('traders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'traders'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>My Traders</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'traders' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {myClients.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'payments' || (activeTab as any) === 'primary-payments' || (activeTab as any) === 'shared-payments'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sales & Payments</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'payments' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {myPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'leads'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>My Leads</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'leads' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {myLeads.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => refreshLivePayments()}
              disabled={isLiveSyncing}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-60"
              title="Refresh live data from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLiveSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-[11px] font-semibold">
                {isLiveSyncing ? 'Syncing...' : 'Sync Live'}
              </span>
            </button>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, UTR..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 flex-1 space-y-3">
          {activeTab === 'leads' && (
            filteredLeads.length > 0 ? filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm transition-all group flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-inner">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{lead.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono
                        ${lead.status === 'interested' ? 'bg-emerald-100 text-emerald-700' : 
                          lead.status === 'callback_requested' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}
                      `}>
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:justify-end">
                  <button 
                    onClick={() => handleConvertToTraderClick(lead.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200/50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Convert to Trader
                  </button>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
                <Users className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No leads found.</p>
              </div>
            )
          )}

          {activeTab === 'traders' && (
            filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <div
                    key={client.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                          {(client.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">{client.name}</h4>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-900 font-extrabold text-[11px] flex items-center gap-1 shrink-0">
                              <CreditCard className="w-3 h-3 text-blue-700" />
                              {client.totalPaymentsCount} Payment{client.totalPaymentsCount === 1 ? '' : 's'} Made
                            </span>
                            {client.pendingPaymentsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[10px] shrink-0">
                                ⏳ {client.pendingPaymentsCount} In Verification
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                            {client.phone && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                                  {client.phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(client.phone);
                                    setCopiedPhoneId(client.id);
                                    setTimeout(() => setCopiedPhoneId(null), 1800);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedPhoneId === client.id ? (
                                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{client.serviceCategory} • {client.serviceType}</span>
                            {client.subscriptionDuration && (
                              <>
                                <span>•</span>
                                <span className="text-teal-600 font-medium">{client.subscriptionDuration}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 self-start md:self-center shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Contributed</span>
                          <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                            ₹{client.totalPaidAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            Your Credit: ₹{client.myCreditedAmount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(client.name);
                              setActiveTab('payments');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer border border-blue-200/60"
                            title="View this client's payments in Payments tab"
                          >
                            <span>Payments</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          {client.payments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                              title={isExpanded ? 'Collapse' : 'Expand Payments'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Payments list under client */}
                    {isExpanded && client.payments.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Payments History for {client.name} ({client.payments.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {client.payments.map((p) => {
                            const credited = getMyCreditedAmount(p);
                            const isSolo = isPrimaryPayment(p);
                            return (
                              <div
                                key={p.id}
                                className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-800">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                                      p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {p.status === 'approved' ? 'Verified' : 'Under Review'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    UTR: {p.utr} • {isSolo ? 'Solo Deal' : 'Shared Split'}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-slate-400 block">Your Share</span>
                                  <span className="font-mono font-black text-emerald-700">₹{credited.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
                <Users className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No traders or clients found matching your search.</p>
              </div>
            )
          )}

          {(activeTab === 'payments' || (activeTab as any) === 'primary-payments' || (activeTab as any) === 'shared-payments') && (
            <div className="space-y-4">
              {/* Payment Sub-Filter Pills & Interactive Sort Control */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                  <button
                    type="button"
                    onClick={() => setPaymentSubFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      paymentSubFilter === 'all'
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>All Sales</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      paymentSubFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {myPayments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentSubFilter('direct')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      paymentSubFilter === 'direct'
                        ? 'bg-white text-amber-800 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>Primary Deals</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      paymentSubFilter === 'direct' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {primaryPayments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentSubFilter('shared')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      paymentSubFilter === 'shared'
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Shared Deals</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      paymentSubFilter === 'shared' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {sharedPayments.length}
                    </span>
                  </button>

                  <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                  <button
                    type="button"
                    onClick={() => setPaymentSubFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      paymentSubFilter === 'approved'
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Approved</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      paymentSubFilter === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {approvedPayments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentSubFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      paymentSubFilter === 'pending'
                        ? 'bg-white text-amber-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Under Review</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      paymentSubFilter === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {pendingPayments.length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 font-mono">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> SORT:
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                  >
                    <option value="date-desc">Latest First</option>
                    <option value="amount-desc">Highest Deal (₹10L+)</option>
                    <option value="amount-asc">Lowest Deal</option>
                  </select>
                </div>
              </div>

              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => {
                  const myCredited = getMyCreditedAmount(payment);
                  const isShared = Boolean(payment.is_shared || (payment.allocations && payment.allocations.length > 1));
                  const otherEmployeesCount = payment.allocations
                    ? payment.allocations.filter((a) => !isEmployeeMatch(a.employee_id, a.employee_name, a.employee_email) && a.allocation_amount > 0).length
                    : 0;
                  const { displayName, displayPhone } = resolveClientContact(payment);

                  return (
                    <div key={payment.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-sm transition-all space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                            {(displayName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-800 text-sm">{displayName}</h4>
                              {displayPhone && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {displayPhone}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(displayPhone);
                                      setCopiedPhoneId(payment.id);
                                      setTimeout(() => setCopiedPhoneId(null), 1800);
                                    }}
                                    className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                    title="Copy Phone"
                                  >
                                    {copiedPhoneId === payment.id ? (
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                            {payment.service_category && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                <span className="font-semibold text-slate-700">{payment.service_category} • {payment.service_type === 'Future Option' ? 'Option' : payment.service_type}</span>
                                <span>•</span>
                                <span className="font-medium text-teal-600">{payment.subscription_duration}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                          {isPrimaryPayment(payment) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase font-mono tracking-wider">
                              <Star className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                              Primary Deal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold uppercase font-mono tracking-wider">
                              <Users className="w-3 h-3 text-indigo-600" />
                              Shared Split
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                            payment.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            payment.status === 'pending_verification' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {payment.status === 'approved' ? '✅ Verified' : payment.status === 'pending_verification' ? '⏳ Under Review' : '❌ Rejected'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Sharing and Amount Breakdown */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Total</span>
                          <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">My Credited Amount</span>
                          <span className={`font-mono font-black text-base mt-0.5 block ${payment.status === 'approved' ? 'text-emerald-700' : 'text-slate-700'}`}>
                            ₹{myCredited.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Deal Attribution</span>
                          {isPrimaryPayment(payment) ? (
                            <span className="font-extrabold text-emerald-700 block mt-0.5 flex items-center gap-1">
                              <Star className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                              Primary Solo Deal (100%)
                            </span>
                          ) : isShared ? (
                            <span className="font-bold text-indigo-700 block mt-0.5 flex items-center gap-1">
                              <Users className="w-3 h-3 text-indigo-600" />
                              Shared ({payment.allocations?.length || 2} Staff)
                            </span>
                          ) : (
                            <span className="font-medium text-slate-600 block mt-0.5">Direct Submission (100%)</span>
                          )}
                        </div>
                      </div>

                      {/* Multi-Employee Split Partners Breakdown Tags */}
                      {isShared && payment.allocations && payment.allocations.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] space-y-1.5">
                          <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">
                            Shared Allocation Breakdown:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {payment.allocations.map((alloc, idx) => {
                              const isMe = isEmployeeMatch(alloc.employee_id, alloc.employee_name, alloc.employee_email);
                              return (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 rounded-lg font-mono font-semibold text-xs flex items-center gap-1.5 border ${
                                    isMe
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                                      : 'bg-white text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <span>{alloc.employee_name || 'Staff'}{isMe ? ' (You)' : ''}:</span>
                                  <span className="font-black text-slate-900">₹{Number(alloc.allocation_amount).toLocaleString('en-IN')}</span>
                                  <span className="text-[10px] text-slate-400">({alloc.allocation_percentage || 0}%)</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-slate-600">UTR: {payment.utr} • Mode: {payment.payment_mode}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(payment.utr);
                              setCopiedUtrId(payment.id);
                              showToast(`UTR ${payment.utr} copied to clipboard!`, 'success');
                              setTimeout(() => setCopiedUtrId(null), 1800);
                            }}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded cursor-pointer"
                            title="Copy UTR"
                          >
                            {copiedUtrId === payment.id ? (
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {resolveClientContact(payment).proofUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(resolveClientContact(payment).proofUrl)}
                              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-200/60 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Receipt</span>
                            </button>
                          )}
                          <span>Date: {new Date(payment.transaction_time || payment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
                  <Wallet className="w-12 h-12 text-slate-200" />
                  <p className="font-medium">No payments matching this filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddLeadModalOpen(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800">Add Warm Lead</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Manually enter a prospect who requested a callback or is interested.</p>
            </div>
            
            <form onSubmit={handleAddLead} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Lead Name</label>
                  <input type="text" required placeholder="e.g., John Doe" 
                    value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Phone Number</label>
                  <input type="tel" required placeholder="+91 XXXXX XXXXX" 
                    value={newLeadData.phone} onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Lead Status</label>
                  <select required 
                    value={newLeadData.status} onChange={e => setNewLeadData({...newLeadData, status: e.target.value as LeadStatus})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 appearance-none">
                    <option value="callback_requested">Callback Requested</option>
                    <option value="interested">Highly Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notes</label>
                  <textarea rows={3} placeholder="Any specific requirements..." 
                    value={newLeadData.notes} onChange={e => setNewLeadData({...newLeadData, notes: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"></textarea>
                </div>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddLeadModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead to Trader Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsConvertModalOpen(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Convert to Active Trader</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Enter initial investment and service details</p>
              </div>
              <button 
                onClick={() => setIsConvertModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleConfirmConvert} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Initial Capital (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 50000"
                    value={convertData.initialCapital}
                    onChange={(e) => setConvertData({ ...convertData, initialCapital: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Service Selected <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={convertData.selectedService}
                  onChange={(e) => setConvertData({ ...convertData, selectedService: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  <option value="" disabled>-- Select Service Details --</option>
                  <option value="Equity Cash">Equity Cash</option>
                  <option value="Equity Futures">Equity Futures</option>
                  <option value="BankNifty/Nifty Options">BankNifty/Nifty Options</option>
                  <option value="Commodity">Commodity (MCX)</option>
                  <option value="HNI">HNI / Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Preferred Market <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={convertData.preferredMarket}
                  onChange={(e) => setConvertData({ ...convertData, preferredMarket: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  <option value="" disabled>-- Select Preferred Market --</option>
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                  <option value="MCX">MCX</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Forex">Forex</option>
                </select>
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  Confirm Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Receipt Inspection Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-14 right-0 text-white hover:text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 font-bold cursor-pointer transition-colors bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20"
            >
              <X className="w-5 h-5" /> Close Inspection
            </button>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 p-2 shadow-2xl w-full flex justify-center items-center overflow-hidden max-h-[80vh]">
              <img 
                src={previewImage} 
                alt="Payment Receipt Proof" 
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <p className="text-sm font-bold">{toast.message}</p>
            <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
