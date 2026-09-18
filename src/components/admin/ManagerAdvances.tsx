import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ManagerAdvance } from '../../types';
import { formatINR } from '../../lib/formatters';
import {
  Banknote,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  User,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const ManagerAdvances: React.FC = () => {
  const { currentUser, users, managerAdvances, addManagerAdvance, updateManagerAdvance, deleteManagerAdvance } =
    useAuth();

  // Guard: Admin-only access
  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3 font-sans max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
        <h3 className="text-base font-bold text-rose-900">Access Restricted</h3>
        <p className="text-xs text-rose-700 leading-relaxed">
          Manager Advances management is strictly restricted to Administrators. You do not have permission to view or manage advance records.
        </p>
      </div>
    );
  }

  // State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<ManagerAdvance | null>(null);
  const [deletingAdvance, setDeletingAdvance] = useState<ManagerAdvance | null>(null);
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formManagerId, setFormManagerId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Managers list
  const managers = useMemo(() => {
    return users.filter((u) => u.role === 'manager');
  }, [users]);

  // Set default manager when opening add modal
  const openAddModal = () => {
    setEditingAdvance(null);
    setFormManagerId(managers[0]?.id || '');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (adv: ManagerAdvance) => {
    setEditingAdvance(adv);
    setFormManagerId(adv.manager_id);
    setFormAmount(adv.amount.toString());
    setFormDate(adv.date);
    setFormNotes(adv.notes || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Filtered advances sorted by date DESC
  const filteredAdvances = useMemo(() => {
    return managerAdvances
      .filter((adv) => {
        const matchesManager = selectedManagerFilter === 'all' || adv.manager_id === selectedManagerFilter;
        const matchesSearch =
          (adv.manager_name && adv.manager_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (adv.notes && adv.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
          adv.date.includes(searchQuery);
        return matchesManager && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [managerAdvances, selectedManagerFilter, searchQuery]);

  // Summary Metrics
  const summary = useMemo(() => {
    const list = selectedManagerFilter === 'all'
      ? managerAdvances
      : managerAdvances.filter((a) => a.manager_id === selectedManagerFilter);

    const totalGiven = list.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastAdvance = sorted[0];

    return {
      totalGiven,
      count: list.length,
      lastDate: lastAdvance ? lastAdvance.date : null,
      lastAmount: lastAdvance ? lastAdvance.amount : 0,
    };
  }, [managerAdvances, selectedManagerFilter]);

  // Running totals calculation: chronological order (oldest to newest) to compute cumulative
  const runningTotalsMap = useMemo(() => {
    const map = new Map<string, number>();
    const sortedOldestFirst = [...managerAdvances].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const cumByManager: Record<string, number> = {};
    sortedOldestFirst.forEach((a) => {
      cumByManager[a.manager_id] = (cumByManager[a.manager_id] || 0) + Number(a.amount);
      map.set(a.id, cumByManager[a.manager_id]);
    });
    return map;
  }, [managerAdvances]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid advance amount greater than 0.');
      return;
    }

    if (!formManagerId) {
      setFormError('Please select a manager.');
      return;
    }

    if (!formDate) {
      setFormError('Please select a valid date.');
      return;
    }

    const selectedManager = users.find((u) => u.id === formManagerId);

    if (editingAdvance) {
      updateManagerAdvance(editingAdvance.id, {
        manager_id: formManagerId,
        manager_name: selectedManager?.name || 'Manager',
        amount: parsedAmount,
        date: formDate,
        notes: formNotes.trim() || undefined,
      });
      showToast(`Updated advance for ${selectedManager?.name || 'Manager'}`);
    } else {
      addManagerAdvance({
        manager_id: formManagerId,
        manager_name: selectedManager?.name || 'Manager',
        amount: parsedAmount,
        date: formDate,
        notes: formNotes.trim() || undefined,
      });
      showToast(`Recorded advance of ${formatINR(parsedAmount)} for ${selectedManager?.name || 'Manager'}`);
    }

    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingAdvance) return;
    deleteManagerAdvance(deletingAdvance.id);
    showToast(`Deleted advance record of ${formatINR(deletingAdvance.amount)}`);
    setDeletingAdvance(null);
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Banknote className="w-5 h-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Manager Salary Advances
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Administrative record of salary advances given to managers against their revenue share.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto border-none active:scale-95"
        >
          <Plus className="w-4 h-4 text-white" />
          Record New Advance
        </button>
      </div>

      {/* Tooltip Explainer Note */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong className="font-bold">About Manager Advances:</strong> Managers earn an executive revenue share of verified client collections. Any salary advances paid to a manager are recorded here by the Administrator and deducted from their cumulative payable balance. This screen is <strong className="font-bold">admin-only</strong> and strictly invisible to managers.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Total Advances Given</span>
            <Banknote className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-900 truncate" title={formatINR(summary.totalGiven)}>
            {formatINR(summary.totalGiven)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {summary.count} total transaction{summary.count !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Last Advance Date</span>
            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono truncate">
            {summary.lastDate ? new Date(summary.lastDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">Most recent disbursement</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Last Advance Amount</span>
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-emerald-700 truncate" title={summary.lastAmount > 0 ? formatINR(summary.lastAmount) : '—'}>
            {summary.lastAmount > 0 ? formatINR(summary.lastAmount) : '—'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">Latest single advance</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Active Managers</span>
            <User className="w-4 h-4 text-purple-600 shrink-0" />
          </div>
          <div className="text-2xl font-black text-purple-700 truncate">{managers.length}</div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {managers.map((m) => m.name).join(', ') || 'None assigned'}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search advances by manager or notes..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedManagerFilter}
              onChange={(e) => setSelectedManagerFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
            >
              <option value="all">All Managers ({managerAdvances.length})</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
            {filteredAdvances.length} Records
          </span>
        </div>
      </div>

      {/* Advances Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredAdvances.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Banknote className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No advance records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {managers.length === 0
                ? 'Assign a manager role to a staff member in Staff & Roles first.'
                : 'Click "Record New Advance" to issue an advance payment to a manager.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Advances Card Stack */}
            <div className="md:hidden block divide-y divide-slate-100">
          {filteredAdvances.map((adv) => {
            const cumulative = runningTotalsMap.get(adv.id) || adv.amount;
            return (
              <div key={adv.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(adv.manager_name || 'M').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{adv.manager_name || 'Manager'}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(adv.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Disbursed</span>
                    <span className="text-sm font-black text-rose-600 font-mono tabular-nums">
                      {formatINR(adv.amount)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Cumulative Total:</span>
                  <span className="font-mono font-bold text-slate-800 tabular-nums">
                    {formatINR(cumulative)}
                  </span>
                </div>

                {adv.notes && (
                  <p className="text-xs text-slate-600 bg-amber-50/40 p-2 rounded-lg border border-amber-100/60 leading-relaxed">
                    {adv.notes}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEditModal(adv)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingAdvance(adv)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Advances Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
              <tr>
                <th className="py-3.5 px-4">Disbursement Date</th>
                <th className="py-3.5 px-4">Manager</th>
                <th className="py-3.5 px-4 text-right">Advance Amount</th>
                <th className="py-3.5 px-4 text-right">Manager Cumulative Total</th>
                <th className="py-3.5 px-4">Notes / Reference</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdvances.map((adv) => {
                const cumulative = runningTotalsMap.get(adv.id) || adv.amount;
                return (
                  <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {new Date(adv.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">
                          {(adv.manager_name || 'M').charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{adv.manager_name || 'Manager'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-600 font-mono text-xs">
                      {formatINR(adv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 text-xs">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        {formatINR(cumulative)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {adv.notes ? (
                        <span title={adv.notes}>{adv.notes}</span>
                      ) : (
                        <span className="text-slate-300 italic">No notes provided</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(adv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Advance"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingAdvance(adv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Advance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>

      {/* Add / Edit Advance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAdvance ? 'Edit Manager Advance' : 'Record Manager Advance'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Manager Selection */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase font-mono text-[10px] block">
                  Select Manager *
                </label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  {managers.length === 0 ? (
                    <option value="">No managers available</option>
                  ) : (
                    managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase font-mono text-[10px] block">
                  Advance Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase font-mono text-[10px] block">
                  Disbursement Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase font-mono text-[10px] block">
                  Notes / Payment Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Advance requested for festival bonus, NEFT ref #..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer border-none active:scale-95"
                >
                  {editingAdvance ? 'Save Changes' : 'Record Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAdvance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Advance Record</h3>
                <p className="text-xs text-slate-500 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the advance of{' '}
              <strong className="text-slate-800 font-bold">{formatINR(deletingAdvance.amount)}</strong> given to{' '}
              <strong className="text-slate-800 font-bold">{deletingAdvance.manager_name || 'Manager'}</strong> on{' '}
              <span className="font-mono text-slate-700">{deletingAdvance.date}</span>?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdvance(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer border-none active:scale-95"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
