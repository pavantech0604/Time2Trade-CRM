import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lead, ActiveTrader } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { StreakBadge } from '../common/StreakBadge';
import { formatINR } from '../../lib/calculations';
import {
  UserCheck,
  TrendingUp,
  Plus,
  CheckCircle,
  XCircle,
  PhoneCall,
  X,
  UserPlus,
  Clock,
  Briefcase,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface RMDashboardProps {
  activeTab: 'rm-leads' | 'rm-traders';
}

export const RMDashboard: React.FC<RMDashboardProps> = ({ activeTab: initialActiveTab }) => {
  const { currentUser, leads, traders, convertLeadToTrader, updateLead, addTradingDay } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'interested' | 'callbacks'>(
    initialActiveTab === 'rm-leads' ? 'interested' : 'interested'
  );
  const [activeMainTab, setActiveMainTab] = useState<'leads' | 'traders'>(
    initialActiveTab === 'rm-traders' ? 'traders' : 'leads'
  );

  const [isAddTraderModalOpen, setIsAddTraderModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add Trader Form
  const [newTraderForm, setNewTraderForm] = useState({
    name: '',
    phone: '',
    email: '',
    initial_capital: 500000,
    trading_experience: 'intermediate' as const,
    preferred_market: 'F&O Options',
    notes: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  if (!currentUser) return null;

  // Filter for RM
  const myRMLeads = leads.filter(
    (l) => (l.rm_assigned_to === currentUser.id || currentUser.role === 'admin') && !l.is_archived
  );

  const interestedLeads = myRMLeads.filter((l) =>
    ['interested_rm_required', 'rm_contacted', 'interested'].includes(l.status)
  );

  const callbackLeads = myRMLeads.filter((l) =>
    ['callback_requested', 'follow_up_later'].includes(l.status)
  );

  const rmTraders = traders.filter(
    (t) => t.rm_assigned_to === currentUser.id || currentUser.role === 'admin'
  );

  // Conversion Modal State
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);

  // Log Trading Day Modal State
  const [logTdTrader, setLogTdTrader] = useState<ActiveTrader | null>(null);
  const [logTdForm, setLogTdForm] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    total_profit: 40000,
    trades_count: 4,
  });

  const handleConfirmConvert = () => {
    if (!convertModalLead) return;
    convertLeadToTrader(convertModalLead.id, currentUser.id);
    showToast(`Lead ${convertModalLead.name} successfully converted to Active Trader!`);
    setConvertModalLead(null);
  };

  const handleMarkContacted = (leadId: string) => {
    updateLead(leadId, { status: 'rm_contacted' });
    showToast('Lead status marked as Contacted.');
  };

  const handleMarkLost = (leadId: string) => {
    updateLead(leadId, { status: 'lost' });
    showToast('Lead marked as Lost.');
  };

  const handleLogTdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTdTrader) return;

    addTradingDay(
      logTdTrader.id,
      logTdForm.trade_date,
      Number(logTdForm.total_profit),
      Number(logTdForm.trades_count)
    );
    showToast(`Logged day P&L for ${logTdTrader.name}`);
    setLogTdTrader(null);
  };

  const handleAddTraderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraderForm.name || !newTraderForm.phone) return;

    const newTraderObj: ActiveTrader = {
      id: `trader-${Date.now()}`,
      name: newTraderForm.name.trim(),
      phone: newTraderForm.phone.trim(),
      email: newTraderForm.email?.trim(),
      rm_assigned_to: currentUser.id,
      rm_assigned_to_name: currentUser.name,
      status: 'active',
      joined_at: new Date().toISOString().split('T')[0],
      initial_capital: Number(newTraderForm.initial_capital),
      trading_experience: newTraderForm.trading_experience,
      preferred_market: newTraderForm.preferred_market,
      notes: newTraderForm.notes,
      current_streak: 0,
      longest_streak: 0,
      total_profit_gained: 0,
      total_profit_shared: 0,
      created_at: new Date().toISOString(),
    };

    traders.unshift(newTraderObj);
    setIsAddTraderModalOpen(false);
    showToast(`Directly added Active Trader: ${newTraderObj.name}`);

    setNewTraderForm({
      name: '',
      phone: '',
      email: '',
      initial_capital: 500000,
      trading_experience: 'intermediate',
      preferred_market: 'F&O Options',
      notes: '',
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-555 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5 font-heading">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Relationship Manager Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage handoff leads, daily client callbacks, convert active traders, and log daily P&L.
          </p>
        </div>

        {activeMainTab === 'traders' && (
          <button
            onClick={() => setIsAddTraderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all cursor-pointer self-start sm:self-auto border-none"
          >
            <UserPlus className="w-4 h-4 text-white" />
            Add New Active Trader
          </button>
        )}
      </div>

      {/* Main Workspace Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setActiveMainTab('leads');
              setActiveSubTab('interested');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'leads'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:text-slate-950 border border-slate-200'
            }`}
          >
            Pipeline Handoffs
          </button>
          <button
            onClick={() => setActiveMainTab('traders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'traders'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:text-slate-950 border border-slate-200'
            }`}
          >
            My Active Traders
          </button>
        </div>

        {activeMainTab === 'leads' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSubTab('interested')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                activeSubTab === 'interested'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800'
              }`}
            >
              Interested ({interestedLeads.length})
            </button>
            <button
              onClick={() => setActiveSubTab('callbacks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                activeSubTab === 'callbacks'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800'
              }`}
            >
              Callbacks ({callbackLeads.length})
            </button>
          </div>
        )}
      </div>

      {/* Leads Content View */}
      {activeMainTab === 'leads' && (
        <div className="space-y-6">
          {(activeSubTab === 'interested' ? interestedLeads : callbackLeads).length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
              <UserCheck className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#091A2F]">No leads in this queue</h4>
              <p className="text-xs text-slate-500">
                You have processed all pending leads in this workspace stage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeSubTab === 'interested' ? interestedLeads : callbackLeads).map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white p-5 rounded-3xl border border-[#C5A028]/20 space-y-4 shadow-sm hover:border-[#C5A028]/50 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#091A2F]">{lead.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {lead.phone} • Source: {lead.source}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>

                  {/* Qualification box */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 space-y-1.5 text-xs text-slate-700 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capital Capacity:</span>
                      <span className="font-bold text-emerald-600">
                        {lead.investment_capacity || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Preferred segment:</span>
                      <span className="font-bold text-purple-700">
                        {lead.preferred_market || 'F&O'}
                      </span>
                    </div>
                    {lead.telecaller_notes && (
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic">
                        &quot;{lead.telecaller_notes}&quot;
                      </div>
                    )}
                  </div>                  {/* Handoff Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    {lead.status !== 'rm_contacted' && (
                      <button
                        onClick={() => handleMarkContacted(lead.id)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 text-[11px] font-bold cursor-pointer transition-colors flex-1 sm:flex-initial text-center"
                      >
                        Mark Contacted
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkLost(lead.id)}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250/60 text-[11px] font-bold cursor-pointer transition-colors flex-1 sm:flex-initial text-center"
                    >
                      Mark Lost
                    </button>
                    <button
                      onClick={() => setConvertModalLead(lead)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/10 cursor-pointer transition-all border-none flex-1 sm:flex-initial text-center w-full sm:w-auto"
                    >
                      Convert to Active Trader
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Traders Content View */}
      {activeMainTab === 'traders' && (
        <div className="space-y-6">
          {rmTraders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
              <TrendingUp className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#091A2F]">No active traders yet</h4>
              <p className="text-xs text-slate-500">
                You haven&apos;t converted or added any traders to your workspace portfolio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rmTraders.map((trader) => (
                <div
                  key={trader.id}
                  className="bg-white p-5 rounded-3xl border border-[#C5A028]/20 space-y-4 shadow-sm hover:border-[#C5A028]/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#091A2F]">{trader.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">{trader.phone}</p>
                    </div>
                    <StatusBadge status={trader.status} />
                  </div>

                  <StreakBadge streak={trader.current_streak} showWeeklyStrip />

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 text-xs space-y-1.5 text-slate-750 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Total Profit Gained:</span>
                      <span className="font-bold text-emerald-600">
                        {formatINR(trader.total_profit_gained)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Total Shared:</span>
                      <span className="font-bold text-blue-700">
                        {formatINR(trader.total_profit_shared)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setLogTdTrader(trader)}
                    className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Daily Trading P&L
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convert Lead Confirmation Modal */}
      {convertModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 font-sans">
            <h3 className="text-base font-bold text-[#091A2F]">Convert Lead to Active Trader</h3>
            <p className="text-xs text-slate-655 leading-relaxed">
              Confirm onboarding <strong className="text-slate-900">{convertModalLead.name}</strong> as an Active Trader. This links their lead qualification records and spawns their profit tracker.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setConvertModalLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/10 cursor-pointer border-none transition-all active:scale-95"
              >
                Onboard Trader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Daily Trading Day Modal */}
      {logTdTrader && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#091A2F]">Log Trading Day — {logTdTrader.name}</h3>
              <button onClick={() => setLogTdTrader(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogTdSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-mono uppercase block mb-1 font-bold">Trade Date</label>
                <input
                  type="date"
                  required
                  value={logTdForm.trade_date}
                  onChange={(e) => setLogTdForm({ ...logTdForm, trade_date: e.target.value })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-slate-500 font-mono uppercase block mb-1 font-bold">Total Daily Profit / Loss (₹)</label>
                <input
                  type="number"
                  required
                  value={logTdForm.total_profit}
                  onChange={(e) => setLogTdForm({ ...logTdForm, total_profit: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-slate-500 font-mono uppercase block mb-1 font-bold">Trades Count</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={logTdForm.trades_count}
                  onChange={(e) => setLogTdForm({ ...logTdForm, trades_count: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 cursor-pointer border-none transition-all active:scale-95"
              >
                Save P&L Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add New Trader Modal */}
      {isAddTraderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#091A2F]">Direct Trader Onboarding</h3>
              </div>
              <button onClick={() => setIsAddTraderModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTraderSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newTraderForm.name}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, name: e.target.value })}
                    placeholder="Rakesh Shah"
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newTraderForm.phone}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newTraderForm.email}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, email: e.target.value })}
                    placeholder="rakesh@gmail.com"
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Trading Capital (₹)</label>
                  <input
                    type="number"
                    value={newTraderForm.initial_capital}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, initial_capital: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Trading Experience</label>
                  <select
                    value={newTraderForm.trading_experience}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, trading_experience: e.target.value as any })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm font-medium"
                  >
                    <option value="beginner">Beginner (&lt; 1 Year)</option>
                    <option value="intermediate">Intermediate (1-3 Years)</option>
                    <option value="advanced">Advanced (&gt; 3 Years)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Preferred Market</label>
                  <input
                    type="text"
                    value={newTraderForm.preferred_market}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, preferred_market: e.target.value })}
                    placeholder="Nifty Options F&O"
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Notes / Comments</label>
                <textarea
                  rows={2}
                  value={newTraderForm.notes}
                  onChange={(e) => setNewTraderForm({ ...newTraderForm, notes: e.target.value })}
                  placeholder="Referral client. Verified via offline onboarding call."
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTraderModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/10 cursor-pointer flex items-center justify-center gap-2 border-none transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  Onboard Active Trader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RMDashboard;
