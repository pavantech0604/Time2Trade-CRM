import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { LeadStatus } from '../../types';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, leads, traders, payments, addLead, convertLeadToTrader, mustResetPassword, setMustResetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'leads' | 'traders' | 'payments'>('leads');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  
  // Toast State
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
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

  // Derived Data: All payments where current employee is primary, submitting, or shared recipient
  const myLeads = leads.filter(l => l.assigned_to === currentUser.id && l.status !== 'active_trader');
  const myTraders = traders.filter(t => t.employee_id === currentUser.id);

  const myPayments = payments.filter(p => {
    const isDirect = p.employee_id === currentUser.id || p.submitted_by_employee_id === currentUser.id;
    const isAllocated = p.allocations?.some(a => a.employee_id === currentUser.id);
    return isDirect || isAllocated;
  });

  const filteredLeads = myLeads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone.includes(searchQuery)
  );

  const filteredTraders = myTraders.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.phone.includes(searchQuery)
  );

  const filteredPayments = myPayments.filter(p => 
    p.trader_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.trader_phone?.includes(searchQuery) ||
    p.utr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMyCreditedAmount = (p: typeof payments[0]) => {
    if (p.allocations && p.allocations.length > 0) {
      const myAlloc = p.allocations.find(a => a.employee_id === currentUser.id);
      return myAlloc ? Number(myAlloc.allocation_amount) : 0;
    }
    return p.employee_id === currentUser.id ? Number(p.amount) : 0;
  };

  const totalProfit = myTraders.reduce((sum, t) => sum + (Number(t.total_profit_shared) || 0), 0);
  const approvedPayments = myPayments.filter(p => p.status === 'approved');
  const pendingPayments = myPayments.filter(p => p.status === 'pending_verification');
  
  // Total sales represents the employee's credited share, not the full payment if shared
  const totalSales = approvedPayments.reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

  // Shared sales received (where employee was added by someone else)
  const sharedSalesReceived = approvedPayments
    .filter(p => p.allocations?.some(a => a.employee_id === currentUser.id && !a.is_primary))
    .reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

  // Category breakdown for approved payments
  const equitySales = approvedPayments
    .filter(p => p.service_category === 'Equity')
    .reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

  const commoditySales = approvedPayments
    .filter(p => p.service_category === 'Commodity')
    .reduce((sum, p) => sum + getMyCreditedAmount(p), 0);

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
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Active Leads"
          value={myLeads.length.toString()}
          icon={PhoneCall}
          variant="info"
          isCurrency={false}
          onClick={() => setActiveTab('leads')}
        />
        <MetricCard
          title="Converted Traders"
          value={myTraders.length.toString()}
          icon={Users}
          variant="positive"
          isCurrency={false}
          onClick={() => setActiveTab('traders')}
        />
        <MetricCard
          title="My Approved Sales"
          value={totalSales}
          icon={Wallet}
          variant="positive"
          isCurrency={true}
          onClick={() => setActiveTab('payments')}
        />
        <MetricCard
          title="Shared Sales Received"
          value={sharedSalesReceived}
          icon={TrendingUp}
          variant="info"
          isCurrency={true}
          onClick={() => setActiveTab('payments')}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[520px]">
        {/* Navigation Tabs and Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leads' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Leads ({myLeads.length})
            </button>
            <button
              onClick={() => setActiveTab('traders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'traders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Traders ({myTraders.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payments' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Sales & Payments ({myPayments.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
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
            filteredTraders.length > 0 ? filteredTraders.map((trader) => (
              <div key={trader.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 shadow-sm transition-all group flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg shadow-inner">
                    {trader.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition-colors">{trader.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {trader.phone}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                        <Wallet className="w-3 h-3" />
                        Capital: ₹{trader.initial_capital?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Profit Shared</span>
                  <span className="font-black text-emerald-600">₹{(trader.total_profit_shared || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
                <TrendingUp className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No active traders found.</p>
              </div>
            )
          )}

          {activeTab === 'payments' && (
            filteredPayments.length > 0 ? filteredPayments.map((payment) => {
              const myCredited = getMyCreditedAmount(payment);
              const isShared = Boolean(payment.is_shared || (payment.allocations && payment.allocations.length > 1));
              const otherEmployeesCount = payment.allocations
                ? payment.allocations.filter((a) => a.employee_id !== currentUser.id && a.allocation_amount > 0).length
                : 0;

              return (
                <div key={payment.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-sm transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base shadow-inner shrink-0">
                        {(payment.client_name || payment.trader_name)?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">{payment.client_name || payment.trader_name || 'Client'}</h4>
                          {(payment.client_phone || payment.trader_phone) && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {payment.client_phone || payment.trader_phone}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(payment.client_phone || payment.trader_phone || '');
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

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        payment.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        payment.status === 'pending_verification' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {payment.status === 'pending_verification' ? 'Under Review' : payment.status}
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
                      <span className="font-mono font-black text-emerald-700 text-base mt-0.5 block">
                        ₹{myCredited.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sharing Status</span>
                      {isShared ? (
                        <span className="font-semibold text-blue-700 block mt-0.5">
                          Shared with {otherEmployeesCount} other {otherEmployeesCount === 1 ? 'employee' : 'employees'}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-500 block mt-0.5">Single employee (100%)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="font-mono">UTR: {payment.utr} • Mode: {payment.payment_mode}</span>
                    <span>Submitted: {new Date(payment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
                <Wallet className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No payment records found.</p>
              </div>
            )
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

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
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
