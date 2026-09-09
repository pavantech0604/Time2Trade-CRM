import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Sparkles, Divide, RotateCcw } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface AllocationCalculatorProps {
  totalAmount: number;
  allocatedAmount: number;
  creditedCount: number;
  onSplitEqually: () => void;
  onAssignRemainingToPrimary: () => void;
  onClearAllocations: () => void;
  disabled?: boolean;
}

export const AllocationCalculator: React.FC<AllocationCalculatorProps> = ({
  totalAmount,
  allocatedAmount,
  creditedCount,
  onSplitEqually,
  onAssignRemainingToPrimary,
  onClearAllocations,
  disabled = false,
}) => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const remaining = totalAmount - allocatedAmount;
  const isComplete = totalAmount > 0 && remaining === 0;
  const isUnder = totalAmount > 0 && remaining > 0;
  const isOver = totalAmount > 0 && remaining < 0;

  const handleActionClick = (
    title: string,
    description: string,
    action: () => void
  ) => {
    // If no custom numbers entered yet, perform directly, otherwise request confirmation
    if (allocatedAmount === 0 || creditedCount <= 1) {
      action();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title,
      description,
      onConfirm: () => {
        action();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Compact Fintech-grade Allocation Card */}
      <div
        className={`p-3 sm:p-4 rounded-2xl border transition-all duration-300 shadow-xs ${
          isComplete
            ? 'bg-emerald-50/60 border-emerald-300/80 ring-1 ring-emerald-400/20'
            : isOver
            ? 'bg-rose-50/60 border-rose-300/80 ring-1 ring-rose-400/20'
            : totalAmount > 0
            ? 'bg-amber-50/60 border-amber-300/80 ring-1 ring-amber-400/20'
            : 'bg-slate-50/80 border-slate-200'
        }`}
      >
        {/* Top Header: Status & Credited Count */}
        <div className="flex items-center justify-between gap-2 pb-1.5">
          <div className="flex items-center gap-1.5">
            {isComplete ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Allocation Balanced
              </span>
            ) : isOver ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                Excess by {formatINR(Math.abs(remaining))}
              </span>
            ) : isUnder ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                {formatINR(remaining)} to allocate
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Enter payment amount to begin
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200/80 shadow-2xs shrink-0">
              {creditedCount} {creditedCount === 1 ? 'Staff' : 'Staff'}
            </span>
          </div>
        </div>

        {/* Dynamic Allocation Progress Bar */}
        {totalAmount > 0 && (
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden my-2">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : isOver
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (allocatedAmount / totalAmount) * 100))}%`,
              }}
            />
          </div>
        )}

        {/* 3 Metric Columns (High density, 1 row on mobile) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
          <div className="bg-white/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-tight">Total</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 block font-mono">
              {formatINR(totalAmount)}
            </span>
          </div>

          <div className="bg-white/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-tight">Allocated</span>
            <span
              className={`text-xs sm:text-sm font-black block font-mono ${
                isComplete ? 'text-emerald-700' : isOver ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {formatINR(allocatedAmount)}
            </span>
          </div>

          <div className="bg-white/80 p-1.5 sm:p-2 rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-tight">
              {isOver ? 'Excess' : isComplete ? 'Status' : 'Remaining'}
            </span>
            <span
              className={`text-xs sm:text-sm font-black block font-mono ${
                isComplete ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'
              }`}
            >
              {isComplete ? '✓ Match' : isOver ? `-${formatINR(Math.abs(remaining))}` : formatINR(remaining)}
            </span>
          </div>
        </div>

        {/* Ergonomic Mobile Quick Actions Toolbar */}
        {totalAmount > 0 && creditedCount > 1 && (
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-200/70">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                handleActionClick(
                  'Split Payment Equally?',
                  `This will distribute the total ₹${totalAmount.toLocaleString('en-IN')} equally among all ${creditedCount} credited employees. Existing individual amounts will be replaced.`,
                  onSplitEqually
                )
              }
              className="flex-1 px-2 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200/80 flex items-center justify-center gap-1 text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
            >
              <Divide className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Split Equally</span>
            </button>

            {remaining > 0 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleActionClick(
                    'Assign Remaining to Primary Employee?',
                    `This will add the remaining ₹${remaining.toLocaleString('en-IN')} to the primary employee's allocation.`,
                    onAssignRemainingToPrimary
                  )
                }
                className="flex-1 px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200/80 flex items-center justify-center gap-1 text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Rest to Primary</span>
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                handleActionClick(
                  'Clear Allocations?',
                  'This will reset additional employees to ₹0 and allocate the full amount back to the primary employee.',
                  onClearAllocations
                )
              }
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold border border-slate-200/80 flex items-center justify-center gap-1 text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
              title="Reset allocations"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h4 className="text-base font-black text-slate-800">{confirmModal.title}</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                {confirmModal.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primaryLight shadow-md shadow-brand-primary/20 transition-all active:scale-95"
              >
                Confirm Rebalance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
