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
  X
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { LeadStatus } from '../../types';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, leads, traders, payments, addLead, convertLeadToTrader } = useAuth();
  const [activeTab, setActiveTab] = useState<'leads' | 'traders' | 'payments'>('leads');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  
  // Toast State
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
    selectedService: 'Equity Cash',
    preferredMarket: 'NSE'
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  // Derived Data
  const myLeads = leads.filter(l => l.assigned_to === currentUser.id && l.status !== 'active_trader');
  const myTraders = traders.filter(t => t.employee_id === currentUser.id);
  const myPayments = payments.filter(p => p.employee_id === currentUser.id);

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
    p.trader_phone?.includes(searchQuery)
  );

  const totalProfit = myTraders.reduce((sum, t) => sum + (Number(t.total_profit_shared) || 0), 0);
  const approvedPayments = myPayments.filter(p => p.status === 'approved');
  const totalSales = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
      setConvertData({ initialCapital: '', selectedService: 'Equity Cash', preferredMarket: 'NSE' });
      setActiveTab('traders'); // Automatically switch to traders tab for better UX
    } catch (err: any) {
      showToast(err.message || 'Failed to convert lead', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">
            Welcome back, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Here's what's happening with your pipeline today.
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Warm Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          title="Total Sales"
          value={totalSales}
          icon={Wallet}
          variant="positive"
          isCurrency={true}
          onClick={() => setActiveTab('payments')}
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[600px]">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 pt-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'leads' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Leads Pipeline
            {activeTab === 'leads' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('traders')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'traders' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Traders
            {activeTab === 'traders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'payments' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Uploaded Payments
            {activeTab === 'payments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'leads' ? 'leads' : activeTab === 'traders' ? 'traders' : 'payments'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Data List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
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
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
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
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <TrendingUp className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No active traders found.</p>
              </div>
            )
          )}

          {activeTab === 'payments' && (
            filteredPayments.length > 0 ? filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-sm transition-all group flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-inner">
                    {payment.trader_name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{payment.trader_name || 'Unknown Trader'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {payment.trader_phone}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono
                        ${payment.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                          payment.status === 'pending_verification' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}
                      `}>
                        {payment.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Amount Paid</span>
                  <span className="font-black text-slate-800">₹{payment.amount.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{new Date(payment.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <Wallet className="w-12 h-12 text-slate-200" />
                <p className="font-medium">No payments found.</p>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
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
