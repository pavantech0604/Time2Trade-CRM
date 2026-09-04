import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTrader, User } from '../../types';
import { StreakBadge } from '../common/StreakBadge';
import { StatusBadge } from '../common/StatusBadge';
import { CalendarHeatmap } from '../common/CalendarHeatmap';
import { formatINR } from '../../lib/calculations';
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Plus, X, UserPlus, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const ActiveTradersView: React.FC = () => {
  const { traders, tradingDays, payments, users, addTradingDay, convertLeadToTrader } = useAuth();

  const [selectedTrader, setSelectedTrader] = useState<ActiveTrader | null>(null);
  const [isLogTdModalOpen, setIsLogTdModalOpen] = useState(false);
  const [isAddTraderModalOpen, setIsAddTraderModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Trader Form
  const rms = users.filter((u) => u.role === 'employee' && u.is_active);
  const [newTraderForm, setNewTraderForm] = useState({
    name: '',
    phone: '',
    email: '',
    employee_id: rms[0]?.id || '',
    initial_capital: 500000,
    selected_service: 'Equity Cash',
    preferred_market: 'NSE',
    notes: '',
  });

  const [logTdForm, setLogTdForm] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    total_profit: 50000,
    trades_count: 5,
  });

  const handleOpenDetail = (trader: ActiveTrader) => {
    setSelectedTrader(trader);
  };

  const handleLogTdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrader) return;

    addTradingDay(selectedTrader.id, logTdForm.trade_date, Number(logTdForm.total_profit), Number(logTdForm.trades_count));
    setIsLogTdModalOpen(false);

    const updatedTraders = traders.find((t) => t.id === selectedTrader.id);
    if (updatedTraders) setSelectedTrader(updatedTraders);
  };

  const handleAddTraderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraderForm.name || !newTraderForm.phone) return;

    const assignedRMObj = users.find((u) => u.id === newTraderForm.employee_id);

    const newTraderObj: ActiveTrader = {
      id: `trader-${Date.now()}`,
      name: newTraderForm.name.trim(),
      phone: newTraderForm.phone.trim(),
      email: newTraderForm.email?.trim(),
      employee_id: newTraderForm.employee_id || rms[0]?.id || 'rm-1',
      employee_name: assignedRMObj?.name || 'Assigned Employee',
      status: 'active',
      joined_at: new Date().toISOString().split('T')[0],
      initial_capital: Number(newTraderForm.initial_capital),
      selected_service: newTraderForm.selected_service,
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
    setToastMsg(`Successfully added active trader: ${newTraderObj.name}`);
    setTimeout(() => setToastMsg(null), 4000);

    setNewTraderForm({
      name: '',
      phone: '',
      email: '',
      employee_id: rms[0]?.id || '',
      initial_capital: 500000,
      selected_service: 'Equity Cash',
      preferred_market: 'NSE',
      notes: '',
    });
  };

  if (selectedTrader) {
    const traderDays = tradingDays
      .filter((d) => d.trader_id === selectedTrader.id)
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

    const chartData = traderDays.map((d) => ({
      date: d.trade_date,
      profit: d.total_profit,
    }));

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Back Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <button
            onClick={() => setSelectedTrader(null)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer w-full sm:w-auto transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" /> Back to Traders List
          </button>

          <button
            onClick={() => setIsLogTdModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 cursor-pointer border-none transition-all active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 text-white" /> Log Daily Trading Day P&L
          </button>
        </div>

        {/* Trader Overview Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-[#091A2F] font-heading">{selectedTrader.name}</h2>
              <StatusBadge status={selectedTrader.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono font-medium">
              Phone: {selectedTrader.phone} • RM: {selectedTrader.employee_name || 'Assigned Employee'} • Joined:{' '}
              {selectedTrader.joined_at}
            </p>
          </div>

          <StreakBadge streak={selectedTrader.current_streak} showWeeklyStrip />
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Profit Gained</span>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{formatINR(selectedTrader.total_profit_gained)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Profit Shared</span>
            <h3 className="text-2xl font-black text-blue-700 mt-1">{formatINR(selectedTrader.total_profit_shared)}</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">Longest Winning Streak</span>
            <h3 className="text-2xl font-black text-amber-700 mt-1">{selectedTrader.longest_streak} Days</h3>
          </div>
        </div>

        {/* Heatmap & P&L Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
          <CalendarHeatmap tradingDays={traderDays} />

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-4 font-mono uppercase">Daily P&L History</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                    formatter={(v: any) => [formatINR(Number(v)), 'P&L']}
                  />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Modal to Log Trading Day */}
        {isLogTdModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#091A2F]">Log Trading Day P&L — {selectedTrader.name}</h3>
                <button onClick={() => setIsLogTdModalOpen(false)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogTdSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Trade Date</label>
                  <input
                    type="date"
                    required
                    value={logTdForm.trade_date}
                    onChange={(e) => setLogTdForm({ ...logTdForm, trade_date: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Total Daily Profit / Loss (₹)</label>
                  <input
                    type="number"
                    required
                    value={logTdForm.total_profit}
                    onChange={(e) => setLogTdForm({ ...logTdForm, total_profit: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Total Trades Executed</label>
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
                  Save & Update Trader Streak
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Traders Table View
  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            Verified Clients Registry
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage your verified active traders and review their allocated resources.
          </p>
        </div>

        {/* Add New Active Trader Button */}
        <button
          onClick={() => setIsAddTraderModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all cursor-pointer self-start sm:self-auto border-none"
        >
          <UserPlus className="w-4 h-4 text-white" />
          Add New Active Trader
        </button>
      </div>

      {/* Mobile View: Card Stack */}
      <div className="md:hidden block space-y-3 font-sans">
        {traders.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 shadow-sm">
            No active traders found.
          </div>
        ) : (
          traders.map((trader) => (
            <div
              key={trader.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm hover:border-[#C5A028]/45 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{trader.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{trader.phone}</p>
                </div>
                <StatusBadge status={trader.status} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 font-sans">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Assigned Employee</span>
                  <span className="font-bold text-slate-700 block mt-0.5">{trader.employee_name || 'RM'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Streak Status</span>
                  <div className="mt-0.5">
                    <StreakBadge streak={trader.current_streak} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Profit Gained</span>
                  <span className="font-bold text-emerald-700 block mt-0.5">{formatINR(trader.total_profit_gained)}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Profit Shared</span>
                  <span className="font-bold text-blue-700 block mt-0.5">{formatINR(trader.total_profit_shared)}</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenDetail(trader)}
                className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs cursor-pointer transition-all shadow-sm active:scale-95 text-center block"
              >
                View P&L Detail
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Heavy Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3.5 px-4 text-slate-500">Trader Name</th>
                <th className="py-3.5 px-4 text-slate-500">Phone</th>
                <th className="py-3.5 px-4 text-slate-500">Assigned Employee</th>
                <th className="py-3.5 px-4 text-slate-500">Status</th>
                <th className="py-3.5 px-4 text-slate-500">Profit Gained</th>
                <th className="py-3.5 px-4 text-slate-500">Profit Shared</th>
                <th className="py-3.5 px-4 text-slate-500">Active Streak</th>
                <th className="py-3.5 px-4 text-right text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 font-mono text-[11px]">
              {traders.map((trader) => (
                <tr key={trader.id} className="hover:bg-slate-50/50 transition-all font-sans border-b border-slate-100/40">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{trader.name}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{trader.phone}</td>
                  <td className="py-3.5 px-4 text-slate-600">{trader.employee_name || 'RM'}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={trader.status} />
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">{formatINR(trader.total_profit_gained)}</td>
                  <td className="py-3.5 px-4 font-bold text-blue-700 font-mono">{formatINR(trader.total_profit_shared)}</td>
                  <td className="py-3.5 px-4">
                    <StreakBadge streak={trader.current_streak} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenDetail(trader)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-[11px] cursor-pointer transition-all shadow-sm"
                    >
                      View P&L Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Active Trader Modal */}
      {isAddTraderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#091A2F]">Add New Active Trader</h3>
              </div>
              <button onClick={() => setIsAddTraderModalOpen(false)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
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
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Assigned Employee</label>
                  <select
                    value={newTraderForm.employee_id}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, employee_id: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm font-medium"
                  >
                    {rms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} (RM)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Initial Investment (₹)</label>
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
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Service Selected</label>
                  <select
                    value={newTraderForm.selected_service}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, selected_service: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm font-medium"
                  >
                    <option value="Equity Cash">Equity Cash</option>
                    <option value="Options Trading">Options Trading</option>
                    <option value="Commodity">Commodity</option>
                    <option value="Portfolio Management">Portfolio Management</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Preferred Market</label>
                  <select
                    value={newTraderForm.preferred_market}
                    onChange={(e) => setNewTraderForm({ ...newTraderForm, preferred_market: e.target.value })}
                    className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm font-medium"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                    <option value="MCX">MCX (Commodity)</option>
                    <option value="Forex">Forex</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold">Notes / Special Preferences</label>
                <textarea
                  rows={2}
                  value={newTraderForm.notes}
                  onChange={(e) => setNewTraderForm({ ...newTraderForm, notes: e.target.value })}
                  placeholder="Client prefers morning session intraday signals..."
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
