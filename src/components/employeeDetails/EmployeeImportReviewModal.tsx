import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Search,
  Check,
  Building2,
  Phone,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  RAW_HANDWRITTEN_EMPLOYEE_STAGING,
  buildStagingRecords,
  normalizePhone,
} from '../../lib/employeeImportData';
import { ImportStagingRecord } from '../../types';

interface EmployeeImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const EmployeeImportReviewModal: React.FC<EmployeeImportReviewModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { users, currentUser, importApprovedEmployees } = useAuth();

  const [selectedRawIds, setSelectedRawIds] = useState<number[]>(() => {
    // By default, pre-select high-confidence matched items that aren't already imported
    const records = buildStagingRecords(users);
    return records
      .filter((r) => r.status === 'matched')
      .map((r) => r.raw_id);
  });

  const [filterMode, setFilterMode] = useState<'all' | 'needs_review' | 'matched' | 'imported'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute live staging records
  const stagingRecords = useMemo(() => {
    return buildStagingRecords(users);
  }, [users]);

  if (!isOpen) return null;

  const filteredRecords = stagingRecords.filter((r) => {
    if (filterMode === 'needs_review') return r.status === 'needs_review';
    if (filterMode === 'matched') return r.status === 'matched';
    if (filterMode === 'imported') return r.status === 'imported';
    return true;
  });

  const toggleSelect = (rawId: number) => {
    setSelectedRawIds((prev) =>
      prev.includes(rawId) ? prev.filter((id) => id !== rawId) : [...prev, rawId]
    );
  };

  const selectAllSafe = () => {
    const safeIds = stagingRecords.filter((r) => r.status === 'matched').map((r) => r.raw_id);
    setSelectedRawIds(safeIds);
  };

  const selectAll = () => {
    setSelectedRawIds(stagingRecords.map((r) => r.raw_id));
  };

  const deselectAll = () => {
    setSelectedRawIds([]);
  };

  const handleApproveImport = async () => {
    if (selectedRawIds.length === 0) {
      setErrorMsg('Please select at least one record to approve and import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await importApprovedEmployees(selectedRawIds);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onImportSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to import employee records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchedCount = stagingRecords.filter((r) => r.status === 'matched').length;
  const reviewCount = stagingRecords.filter((r) => r.status === 'needs_review').length;
  const importedCount = stagingRecords.filter((r) => r.status === 'imported').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Import Employee Sheet Review</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 font-mono">
                  15 Records Staged
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Audited review of handwritten staff contact roster before production sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Warning Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Handwritten Source Safety Protocol:</strong> Records are treated as unverified pending review. Digits with handwriting ambiguities (2 vs 7, 1 vs 7) are flagged below.
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0 font-bold">
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{matchedCount} Matched</span>
            <span className="text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">{reviewCount} Needs Review</span>
            <span className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">{importedCount} Up to Date</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filter View:</span>
            <div className="flex rounded-xl bg-white border border-slate-200 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (15)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('matched')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'matched' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Safe Matched ({matchedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('needs_review')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'needs_review' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Needs Review ({reviewCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('imported')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'imported' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Imported ({importedCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAllSafe}
              className="text-blue-600 hover:underline font-bold"
            >
              Select Safe
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={selectAll}
              className="text-slate-600 hover:underline"
            >
              Select All
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-600 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRawIds.length === stagingRecords.length}
                      onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center font-mono">No</th>
                  <th className="py-2.5 px-3">Handwritten Name</th>
                  <th className="py-2.5 px-3">Personal Phone</th>
                  <th className="py-2.5 px-3">Office Phone</th>
                  <th className="py-2.5 px-3">Matched CRM User</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Handwriting Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => {
                  const isSelected = selectedRawIds.includes(item.raw_id);
                  const isReview = item.status === 'needs_review';
                  const isImported = item.status === 'imported';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/30' : ''
                      } ${isReview ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.raw_id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {item.raw_id}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {item.employee_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {item.personal_phone}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {item.office_phone ? (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {item.office_phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">NULL / None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.matched_user_name ? (
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{item.matched_user_name}</span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-medium italic">No Match</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.status === 'matched' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Matched
                          </span>
                        )}
                        {item.status === 'needs_review' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Needs Review
                          </span>
                        )}
                        {item.status === 'imported' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Up to Date
                          </span>
                        )}
                        {item.status === 'new' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            New Account
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-xs">
                        {item.notes ? (
                          <span className={isReview ? 'text-amber-800 font-medium' : ''}>
                            {item.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">{selectedRawIds.length}</span> of 15 records selected for approval.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveImport}
              disabled={isSubmitting || selectedRawIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing Production Records...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approve & Import Selected ({selectedRawIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
