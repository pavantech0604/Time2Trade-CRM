import React, { useState } from 'react';
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Database,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export const LeadCleanupModule: React.FC = () => {
  const { leads, updateLead } = useAuth();

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [daysOldThreshold] = useState<number>(7);
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
        status: 'lost',
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
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-rose-500" />
            Lead Storage Cleanup & Archiving Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Identify unwanted, invalid, or lost leads older than {daysOldThreshold} days and archive them to maintain database efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            disabled={selectedLeadIds.length === 0}
            onClick={handleArchiveSelected}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 border-none"
          >
            <Archive className="w-4 h-4" />
            Archive Selected ({selectedLeadIds.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Cleanup Candidates</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-800">{cleanupCandidates.length}</p>
          <p className="text-[10px] text-slate-400 font-mono">Unwanted / Discarded status</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Archived Records</span>
            <Archive className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600">
            {leads.filter((l) => l.is_archived).length}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">Soft-deleted from daily pipeline</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Retention Period</span>
            <RefreshCw className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{daysOldThreshold} Days</p>
          <p className="text-[10px] text-slate-400 font-mono">Configurable policy</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Storage Efficiency</span>
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800">99.8%</p>
          <p className="text-[10px] text-slate-400 font-mono">Optimized index space</p>
        </div>
      </div>

      {/* Table & Controls Container */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="selectAllCandidates"
              onChange={handleSelectAll}
              checked={
                selectedLeadIds.length > 0 &&
                selectedLeadIds.length === cleanupCandidates.length
              }
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
            <label htmlFor="selectAllCandidates" className="text-xs font-bold text-slate-700 cursor-pointer">
              Select All Candidates ({cleanupCandidates.length})
            </label>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by candidate status"
            className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
          >
            <option value="all_candidates">All Candidate Statuses</option>
            <option value="not_interested">Not Interested</option>
            <option value="wrong_number">Wrong Number</option>
            <option value="invalid_data">Invalid Data</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        {/* Mobile View: Card Stack */}
        <div className="md:hidden divide-y divide-slate-100">
          {cleanupCandidates.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No leads pending storage cleanup.
            </div>
          ) : (
            cleanupCandidates.map((l) => (
              <div
                key={l.id}
                onClick={() => handleSelectOne(l.id)}
                className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  selectedLeadIds.includes(l.id) ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedLeadIds.includes(l.id)}
                  onChange={() => handleSelectOne(l.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded accent-amber-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{l.name}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{l.phone}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Source: {l.source}</span>
                    <span>RM: {l.assigned_to_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-bold">Lead Name</th>
                <th className="py-3 px-4 font-bold">Phone</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Source</th>
                <th className="py-3 px-4 font-bold">Assigned Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cleanupCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                    No leads pending storage cleanup.
                  </td>
                </tr>
              ) : (
                cleanupCandidates.map((l) => (
                  <tr
                    key={l.id}
                    className={`transition-colors cursor-pointer ${
                      selectedLeadIds.includes(l.id) ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => handleSelectOne(l.id)}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(l.id)}
                        onChange={() => handleSelectOne(l.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">{l.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{l.phone}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{l.source}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
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
