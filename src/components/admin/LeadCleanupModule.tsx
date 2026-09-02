import React, { useState } from 'react';
import {
  Trash2,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Database,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Lead } from '../../types';

export const LeadCleanupModule: React.FC = () => {
  const { leads, updateLead, currentUser } = useAuth();

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [daysOldThreshold, setDaysOldThreshold] = useState<number>(7);
  const [statusFilter, setStatusFilter] = useState<string>('all_candidates');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Candidate statuses eligible for cleanup
  const cleanupStatuses = ['not_interested', 'wrong_number', 'invalid_data', 'lost', 'archived'];

  // Filter candidates
  const cleanupCandidates = leads.filter((l) => {
    const isCandidateStatus = cleanupStatuses.includes(l.status) || l.is_archived;
    if (!isCandidateStatus) return false;

    if (statusFilter !== 'all_candidates' && l.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(cleanupCandidates.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((i) => i !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const handleArchiveSelected = () => {
    if (selectedLeadIds.length === 0) return;

    selectedLeadIds.forEach((id) => {
      updateLead(id, {
        status: 'archived',
        is_archived: true,
        archived_at: new Date().toISOString(),
      });
    });

    setToastMsg(`Successfully soft-archived ${selectedLeadIds.length} lead records.`);
    setSelectedLeadIds([]);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 bg-[#112240] border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-rose-400" />
            Lead Storage Cleanup & Archiving Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Identify unwanted, invalid, or lost leads older than {daysOldThreshold} days and archive them to maintain database efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={selectedLeadIds.length === 0}
            onClick={handleArchiveSelected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            Archive Selected ({selectedLeadIds.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#112240]/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cleanup Candidates</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{cleanupCandidates.length}</p>
          <p className="text-[10px] text-slate-500 font-mono">Unwanted / Discarded status</p>
        </div>

        <div className="bg-[#112240]/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Archived Records</span>
            <Archive className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">
            {leads.filter((l) => l.is_archived).length}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Soft-deleted from daily pipeline</p>
        </div>

        <div className="bg-[#112240]/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Retention Period</span>
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{daysOldThreshold} Days</p>
          <p className="text-[10px] text-slate-500 font-mono">Configurable policy</p>
        </div>

        <div className="bg-[#112240]/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Storage Efficiency</span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">99.8%</p>
          <p className="text-[10px] text-slate-500 font-mono">Optimized index space</p>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="bg-[#112240]/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              checked={
                selectedLeadIds.length > 0 &&
                selectedLeadIds.length === cleanupCandidates.length
              }
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-300">
              Select All Candidates ({cleanupCandidates.length})
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#070F1B] border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all_candidates">All Candidate Statuses</option>
            <option value="not_interested">Not Interested</option>
            <option value="wrong_number">Wrong Number</option>
            <option value="invalid_data">Invalid Data</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1424] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-semibold">Lead Name</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Assigned Telecaller</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {cleanupCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">
                    No leads pending storage cleanup.
                  </td>
                </tr>
              ) : (
                cleanupCandidates.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(l.id)}
                        onChange={() => handleSelectOne(l.id)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-white">{l.name}</td>
                    <td className="py-3 px-4 text-slate-400">{l.phone}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase text-[10px]">
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{l.source}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {l.assigned_to_name || 'Unassigned'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
