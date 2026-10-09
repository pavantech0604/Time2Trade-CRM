import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Shield,
  FileText,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User as UserType, ActiveTrader, Lead } from '../../types';

interface ClientTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ActiveTrader | Lead;
  clientType: 'trader' | 'lead';
  currentEmployee?: UserType | null;
  onSuccess?: () => void;
}

const TRANSFER_REASONS = [
  'Client Handover / Re-allocation',
  'Workload & Portfolio Balancing',
  'Staff Leave / Temporary Coverage',
  'Escalation & Senior Advisory Handover',
  'Client Request / Language Preference',
  'Performance Optimization',
  'Internal Team Restructuring',
];

export const ClientTransferModal: React.FC<ClientTransferModalProps> = ({
  isOpen,
  onClose,
  client,
  clientType,
  currentEmployee,
  onSuccess,
}) => {
  const { users, currentUser, transferClient } = useAuth();

  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(TRANSFER_REASONS[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter available target employees
  // Admin can transfer to any active employee. Manager can transfer within team.
  const currentEmpId = (client as any).assigned_to || (client as any).employee_id;
  const eligibleEmployees = users.filter((u) => {
    if (u.id === currentEmpId) return false;
    if (!u.is_active || u.approval_status === 'rejected') return false;
    if (currentUser?.role === 'manager') {
      // Must be in manager's team or self
      return u.manager_id === currentUser.id || u.id === currentUser.id || u.role === 'employee';
    }
    return u.role === 'employee' || u.role === 'manager';
  });

  const selectedTargetEmp = users.find((u) => u.id === targetEmployeeId);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeId) {
      setError('Please select a destination employee.');
      return;
    }

    const fullReason = customNotes.trim()
      ? `${selectedReason} - ${customNotes.trim()}`
      : selectedReason;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await transferClient(client.id, clientType, targetEmployeeId, fullReason);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs text-blue-200">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Transfer Client Ownership</h3>
              <p className="text-xs text-blue-200/80">
                Audited client reassignment with permanent historical preservation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close transfer modal"
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4.5 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Client Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Client To Be Transferred
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800">{client.name}</div>
                <div className="text-xs text-slate-500 font-mono">{client.phone}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider font-mono">
                {clientType === 'trader' ? 'Active Trader' : 'Lead'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-600 flex items-center justify-between">
              <span>Current Handling Staff:</span>
              <span className="font-semibold text-slate-800">
                {currentEmployee?.name || 'Assigned Staff'}
              </span>
            </div>
          </div>

          {/* Destination Employee Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Destination Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-medium"
            >
              <option value="">-- Choose employee to receive client --</option>
              {eligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.designation || 'Staff'} {emp.office_phone ? `• Office: ${emp.office_phone}` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Primary Transfer Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-medium"
            >
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Notes / Audit Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Additional Handover Notes (Optional)
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Client requested Tamil speaking advisor; pending trade follow-up tomorrow..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 resize-none"
            />
          </div>

          {/* Transfer Impact Notice */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Shield className="w-3.5 h-3.5" />
              <span>Immutable Audit & Historical Guarantee</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              • Previous staff member will retain full visibility in their <strong>Previously Handled</strong> tab.<br />
              • All historical sales attribution and payment verification records remain 100% intact.<br />
              • The timestamp, actor ({currentUser?.name}), and reason will be recorded in the audit ledger.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetEmployeeId}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirm Handover</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
