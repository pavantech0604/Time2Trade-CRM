import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lead, LeadStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  PhoneCall,
  UserCheck,
  Search,
  X,
  Clock,
  PhoneOff,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  XCircle,
  Filter,
  ArrowRight,
  Loader2,
  Plus,
} from 'lucide-react';

export const TelecallerDashboard: React.FC = () => {
  const { currentUser, leads, handoffLead, updateLead, users, addLead } = useAuth();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'not_answered' | 'callback' | 'interested' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Callback modal state
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [callbackTime, setCallbackTime] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [callbackRmId, setCallbackRmId] = useState<string>('');

  // Discard / Unwanted modal state
  const [discardLead, setDiscardLead] = useState<Lead | null>(null);
  const [discardReason, setDiscardReason] = useState<LeadStatus>('not_interested');

  // Qualification form state
  const rms = users.filter((u) => u.role === 'relationship_manager' && u.is_active);
  const [qualForm, setQualForm] = useState({
    investment_capacity: '₹10,00,000',
    trading_experience: 'intermediate' as Lead['trading_experience'],
    preferred_market: 'F&O Options',
    telecaller_notes: '',
    rm_assigned_to: rms[0]?.id || '',
  });

  // Manual Lead Entry Modal State
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    status: 'interested_rm_required' as LeadStatus,
    next_follow_up_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    rm_assigned_to: rms[0]?.id || '',
    investment_capacity: '₹10,00,000',
    trading_experience: 'intermediate' as Lead['trading_experience'],
    preferred_market: 'F&O Options',
    telecaller_notes: '',
  });

  if (!currentUser) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter leads assigned to current telecaller
  const allMyLeads = leads.filter(
    (l) => (l.assigned_to === currentUser.id || currentUser.role === 'admin') && !l.is_archived
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredLeads = allMyLeads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      (l.source && l.source.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'today') {
      return (l.status === 'new' || l.status === 'called') && (l.upload_date === todayStr || !l.upload_date);
    }
    if (activeTab === 'not_answered') {
      return l.status === 'not_answered';
    }
    if (activeTab === 'callback') {
      return l.status === 'callback_requested' || l.status === 'follow_up_later';
    }
    if (activeTab === 'interested') {
      return l.status === 'interested' || l.status === 'interested_rm_required';
    }

    return true;
  });

  // KPI Counts
  const todayCount = allMyLeads.filter((l) => (l.status === 'new' || l.status === 'called') && (l.upload_date === todayStr || !l.upload_date)).length;
  const notAnsweredCount = allMyLeads.filter((l) => l.status === 'not_answered').length;
  const callbackCount = allMyLeads.filter((l) => l.status === 'callback_requested' || l.status === 'follow_up_later').length;
  const interestedCount = allMyLeads.filter((l) => l.status === 'interested' || l.status === 'interested_rm_required').length;

  const handleOpenDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setQualForm({
      investment_capacity: lead.investment_capacity || '₹10,00,000',
      trading_experience: lead.trading_experience || 'intermediate',
      preferred_market: lead.preferred_market || 'F&O Options',
      telecaller_notes: lead.telecaller_notes || '',
      rm_assigned_to: lead.rm_assigned_to || rms[0]?.id || '',
    });
  };

  const handleHandoff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    handoffLead(selectedLead.id, qualForm);
    showToast(`Lead ${selectedLead.name} qualified and forwarded to RM queue!`);
    setSelectedLead(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name.trim() || !manualForm.phone.trim()) return;

    const newLeadData: any = {
      name: manualForm.name,
      phone: manualForm.phone,
      source: 'Manual Calling',
      status: manualForm.status,
      assigned_to: currentUser.id,
      assigned_to_name: currentUser.name,
      telecaller_notes: manualForm.telecaller_notes,
    };

    if (manualForm.status === 'callback_requested' || manualForm.status === 'follow_up_later') {
      newLeadData.next_follow_up_at = manualForm.next_follow_up_at;
      if (manualForm.rm_assigned_to) {
        newLeadData.rm_assigned_to = manualForm.rm_assigned_to;
        newLeadData.rm_assigned_to_name = rms.find((r) => r.id === manualForm.rm_assigned_to)?.name;
      }
    } else if (manualForm.status === 'interested' || manualForm.status === 'interested_rm_required') {
      newLeadData.status = 'interested_rm_required'; // Automatically push to RM
      newLeadData.investment_capacity = manualForm.investment_capacity;
      newLeadData.trading_experience = manualForm.trading_experience;
      newLeadData.preferred_market = manualForm.preferred_market;
      if (manualForm.rm_assigned_to) {
        newLeadData.rm_assigned_to = manualForm.rm_assigned_to;
        newLeadData.rm_assigned_to_name = rms.find((r) => r.id === manualForm.rm_assigned_to)?.name;
      }
    }

    // Call addLead from AuthContext
    // We must pass an object that matches Omit<Lead, 'id' | 'created_at'>
    addLead(newLeadData);
    
    showToast(`Lead ${manualForm.name} added successfully!`);
    setIsManualEntryOpen(false);
    
    // reset form
    setManualForm({
      name: '',
      phone: '',
      status: 'interested_rm_required',
      next_follow_up_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      rm_assigned_to: rms[0]?.id || '',
      investment_capacity: '₹10,00,000',
      trading_experience: 'intermediate',
      preferred_market: 'F&O Options',
      telecaller_notes: '',
    });
  };

  const handleMarkCalled = (leadId: string) => {
    updateLead(leadId, { status: 'called' });
    showToast('Lead status updated to Called.');
  };

  const handleMarkNotAnswered = (leadId: string) => {
    updateLead(leadId, { status: 'not_answered', telecaller_notes: 'Phone rang / No response.' });
    showToast('Marked as Not Answered.');
  };

  const handleOpenCallbackModal = (lead: Lead) => {
    setCallbackLead(lead);
    setCallbackRmId(lead.rm_assigned_to || rms[0]?.id || '');
    setCallbackTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  };

  const handleSaveCallback = () => {
    if (!callbackLead) return;
    const selectedRm = rms.find((r) => r.id === callbackRmId);
    updateLead(callbackLead.id, {
      status: 'callback_requested',
      next_follow_up_at: callbackTime,
      rm_assigned_to: callbackRmId || undefined,
      rm_assigned_to_name: selectedRm?.name || undefined,
      telecaller_notes: `Callback scheduled for ${new Date(callbackTime).toLocaleString()}. Assigned to RM: ${selectedRm?.name || 'Unassigned'}`,
    });
    showToast(`Callback scheduled and transferred to RM ${selectedRm?.name || ''}`);
    setCallbackLead(null);
  };

  const handleConfirmDiscard = () => {
    if (!discardLead) return;
    updateLead(discardLead.id, {
      status: discardReason,
      telecaller_notes: `Marked as ${discardReason.replace(/_/g, ' ')} during call.`,
    });
    showToast(`Lead ${discardLead.name} tagged as ${discardReason.replace(/_/g, ' ')}`);
    setDiscardLead(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3 font-sans">
          <CheckCircle2 className="w-4 h-4 text-emerald-550 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-blue-600" />
            Telecaller Pipeline Workstation
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Filter daily leads, track call outcomes, schedule callbacks, and forward qualified leads to RMs.
          </p>
        </div>
        <button
          onClick={() => setIsManualEntryOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Manual Call / Add Lead
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-blue-50 border-blue-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Today&apos;s Fresh Leads</span>
            <PhoneCall className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{todayCount}</p>
          <p className="text-[10px] text-slate-400 font-mono">Assigned for initial calling</p>
        </button>

        <button
          onClick={() => setActiveTab('not_answered')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'not_answered'
              ? 'bg-amber-50 border-amber-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Not Answered</span>
            <PhoneOff className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-850 mt-1">{notAnsweredCount}</p>
          <p className="text-[10px] text-amber-600 font-mono font-medium">Retry calling needed</p>
        </button>

        <button
          onClick={() => setActiveTab('callback')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'callback'
              ? 'bg-purple-50 border-purple-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>Callbacks Scheduled</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-800 mt-1">{callbackCount}</p>
          <p className="text-[10px] text-purple-650 font-mono font-medium">Follow-up appointment</p>
        </button>

        <button
          onClick={() => setActiveTab('interested')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'interested'
              ? 'bg-emerald-50 border-emerald-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Interested (Forwarded)</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1">{interestedCount}</p>
          <p className="text-[10px] text-emerald-600 font-mono font-medium">Qualified for RM desk</p>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80 font-sans">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name or phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-450 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Workflow Tab Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0 scroll-smooth -mx-4 px-4 md:mx-0 md:px-0 font-sans">
          {[
            { id: 'today', label: "Today's Leads" },
            { id: 'not_answered', label: 'Not Answered' },
            { id: 'callback', label: 'Callbacks' },
            { id: 'interested', label: 'Interested' },
            { id: 'all', label: 'All Leads' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-105 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Container (Responsive) */}
      <div className="bg-white rounded-3xl border border-[#C5A028]/20 overflow-hidden shadow-md">
        
        {/* Desktop View: Structured Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3.5 px-4 font-bold text-slate-600">Lead Name</th>
                <th className="py-3.5 px-4 font-bold text-slate-600">Phone Number</th>
                <th className="py-3.5 px-4 font-bold text-slate-600">Source</th>
                <th className="py-3.5 px-4 font-bold text-slate-600">Status</th>
                <th className="py-3.5 px-4 font-bold text-slate-600">Assigned RM</th>
                <th className="py-3.5 px-4 text-right font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-550 font-sans">
                    No leads found in this workflow view.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-all font-sans border-b border-slate-100/60">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{lead.name}</td>
                    <td className="py-3.5 px-4">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
                        {lead.phone}
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-slate-550">{lead.source}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-550">
                      {lead.rm_assigned_to_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Not Answered */}
                        <button
                          onClick={() => handleMarkNotAnswered(lead.id)}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold cursor-pointer transition-colors"
                          title="Mark Phone Not Answered"
                        >
                          No Ans
                        </button>

                        {/* Callback Schedule */}
                        <button
                          onClick={() => handleOpenCallbackModal(lead)}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Callback
                        </button>

                        {/* Interested Forward */}
                        <button
                          onClick={() => handleOpenDrawer(lead)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/25 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Forward to RM Desk
                        </button>

                        {/* Discard / Unwanted */}
                        <button
                          onClick={() => setDiscardLead(lead)}
                          className="p-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[11px] cursor-pointer transition-colors"
                          title="Mark Unwanted / Wrong Number"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Touch-Friendly Card Stack */}
        <div className="md:hidden block divide-y divide-slate-100">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-sans">
              No leads found in this workflow view.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-4 bg-white hover:bg-slate-50/50 transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">{lead.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full font-mono font-medium">
                        {lead.source || 'Scanned Lead'}
                      </span>
                      {lead.language && (
                        <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-sans font-semibold">
                          {lead.language}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Call Action */}
                  <a
                    href={`tel:${lead.phone}`}
                    className="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center border border-blue-200 text-blue-600 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                    title="Call Lead"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 font-sans">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">Status</span>
                    <div className="mt-1">
                      <StatusBadge status={lead.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">RM Assigned</span>
                    <span className="text-slate-700 font-bold block mt-1">
                      {lead.rm_assigned_to_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Touch-Friendly Action Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1 font-sans">
                  <button
                    onClick={() => handleMarkNotAnswered(lead.id)}
                    className="py-2.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10.5px] font-bold text-center cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    No Ans
                  </button>

                  <button
                    onClick={() => handleOpenCallbackModal(lead)}
                    className="py-2.5 px-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10.5px] font-bold text-center cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    Callback
                  </button>

                  <button
                    onClick={() => handleOpenDrawer(lead)}
                    className="col-span-2 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold text-center cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                  >
                    Forward to RM <ArrowRight className="w-3 h-3 text-white" />
                  </button>

                  <button
                    onClick={() => setDiscardLead(lead)}
                    className="col-span-4 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-[10px] font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Mark Unwanted / Wrong Number
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Qualification & RM Forwarding Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end font-sans">
          <div className="w-full max-w-md bg-white h-full border-l border-slate-200 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-[#091A2F] text-base">Verify & Forward to RM Desk</h3>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Lead Name:</span>
                <span className="font-bold text-slate-900">{selectedLead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone Number:</span>
                <span className="text-blue-700 font-mono font-bold">{selectedLead.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Lead Source:</span>
                <span className="text-slate-800 font-medium">{selectedLead.source}</span>
              </div>
            </div>

            <form onSubmit={handleHandoff} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Investment Capital Capacity *
                </label>
                <select
                  value={qualForm.investment_capacity}
                  onChange={(e) => setQualForm({ ...qualForm, investment_capacity: e.target.value })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium shadow-sm"
                >
                  <option value="₹2,00,000">₹2,00,000 (Standard)</option>
                  <option value="₹5,00,000">₹5,00,000 (Gold)</option>
                  <option value="₹10,00,000">₹10,00,000 (Platinum HNI)</option>
                  <option value="₹25,00,000+">₹25,00,000+ (Institutional HNI)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Trading Experience *
                </label>
                <select
                  value={qualForm.trading_experience}
                  onChange={(e) => setQualForm({ ...qualForm, trading_experience: e.target.value as any })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium shadow-sm"
                >
                  <option value="beginner">Beginner (&lt; 1 Year)</option>
                  <option value="intermediate">Intermediate (1-3 Years)</option>
                  <option value="advanced">Advanced (&gt; 3 Years)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Preferred Segment / Market *
                </label>
                <input
                  type="text"
                  required
                  value={qualForm.preferred_market}
                  onChange={(e) => setQualForm({ ...qualForm, preferred_market: e.target.value })}
                  placeholder="Nifty Options / BankNifty"
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Assign Relationship Manager *
                </label>
                <select
                  value={qualForm.rm_assigned_to}
                  onChange={(e) => setQualForm({ ...qualForm, rm_assigned_to: e.target.value })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium shadow-sm"
                >
                  {rms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} (RM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Telecaller Call Summary Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={qualForm.telecaller_notes}
                  onChange={(e) => setQualForm({ ...qualForm, telecaller_notes: e.target.value })}
                  placeholder="Client is active in Index Options. Wants daily advisory calls..."
                  className="w-full bg-white border border-slate-250 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-550 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer mt-4 transition-all active:scale-95 border-none"
              >
                Submit Promotion & Route
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Callback Modal */}
      {callbackLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#091A2F] text-sm">Schedule Callback — {callbackLead.name}</h3>
              <button onClick={() => setCallbackLead(null)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                Callback Date & Time *
              </label>
              <input
                type="datetime-local"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 shadow-sm"
              />
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                Assign Relationship Manager (RM) *
              </label>
              <select
                value={callbackRmId}
                onChange={(e) => setCallbackRmId(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer font-medium shadow-sm"
              >
                <option value="" disabled>-- Select RM --</option>
                {rms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} (RM)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCallbackLead(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCallback}
                className="flex-1 py-2.5 rounded-xl bg-purple-650 hover:bg-purple-600 text-white text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Save Callback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Unwanted Lead Modal */}
      {discardLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#091A2F] text-sm">Mark Lead Unwanted — {discardLead.name}</h3>
              <button onClick={() => setDiscardLead(null)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Reason for Discard</label>
              <select
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value as any)}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer font-medium shadow-sm"
              >
                <option value="not_interested">Not Interested</option>
                <option value="wrong_number">Wrong Number / Invalid</option>
                <option value="invalid_data">Not Eligible / Out of Scope</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDiscardLead(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-all active:scale-95"
              >
                Confirm Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Lead Entry Modal */}
      {isManualEntryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#091A2F] text-sm md:text-base">Log Manual Call</h3>
              </div>
              <button onClick={() => setIsManualEntryOpen(false)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                    Lead Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    placeholder="E.g. Rajesh Kumar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Call Outcome / Status *
                </label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer font-bold shadow-sm"
                >
                  <option value="interested_rm_required">Interested / Forward to RM</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="not_answered">Not Answered / Busy</option>
                  <option value="not_interested">Not Interested / Discard</option>
                </select>
              </div>

              {(manualForm.status === 'callback_requested' || manualForm.status === 'follow_up_later') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                      Callback Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={manualForm.next_follow_up_at}
                      onChange={(e) => setManualForm({ ...manualForm, next_follow_up_at: e.target.value })}
                      className="w-full bg-white border border-purple-250 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-purple-500 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                      Assign to RM (Optional)
                    </label>
                    <select
                      value={manualForm.rm_assigned_to}
                      onChange={(e) => setManualForm({ ...manualForm, rm_assigned_to: e.target.value })}
                      className="w-full bg-white border border-purple-250 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-sm"
                    >
                      <option value="">-- No RM (Keep for myself) --</option>
                      {rms.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} (RM)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(manualForm.status === 'interested' || manualForm.status === 'interested_rm_required') && (
                <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in duration-300">
                  <h4 className="text-emerald-700 font-bold text-xs border-b border-emerald-200/60 pb-2">RM Qualification Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-emerald-700/80 font-mono uppercase block text-[9px] font-bold">
                        Investment Capacity
                      </label>
                      <select
                        value={manualForm.investment_capacity}
                        onChange={(e) => setManualForm({ ...manualForm, investment_capacity: e.target.value })}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                      >
                        <option value="₹2,00,000">₹2,00,000 (Standard)</option>
                        <option value="₹5,00,000">₹5,00,000 (Gold)</option>
                        <option value="₹10,00,000">₹10,00,000 (Platinum HNI)</option>
                        <option value="₹25,00,000+">₹25,00,000+ (Institutional HNI)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-700/80 font-mono uppercase block text-[9px] font-bold">
                        Trading Experience
                      </label>
                      <select
                        value={manualForm.trading_experience}
                        onChange={(e) => setManualForm({ ...manualForm, trading_experience: e.target.value as any })}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                      >
                        <option value="beginner">Beginner (&lt; 1 Year)</option>
                        <option value="intermediate">Intermediate (1-3 Years)</option>
                        <option value="advanced">Advanced (&gt; 3 Years)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-700/80 font-mono uppercase block text-[9px] font-bold">
                        Preferred Segment
                      </label>
                      <input
                        type="text"
                        required
                        value={manualForm.preferred_market}
                        onChange={(e) => setManualForm({ ...manualForm, preferred_market: e.target.value })}
                        placeholder="Nifty Options / Crypto"
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-700/80 font-mono uppercase block text-[9px] font-bold">
                        Assign to RM *
                      </label>
                      <select
                        required
                        value={manualForm.rm_assigned_to}
                        onChange={(e) => setManualForm({ ...manualForm, rm_assigned_to: e.target.value })}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold shadow-sm"
                      >
                        {rms.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name} (RM)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">
                  Telecaller Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualForm.telecaller_notes}
                  onChange={(e) => setManualForm({ ...manualForm, telecaller_notes: e.target.value })}
                  placeholder="Discussed equity portfolio, asked to call tomorrow..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualEntryOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  Save Log
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
