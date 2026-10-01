import React, { useState, useEffect } from 'react';
import { Target, X, Check, DollarSign } from 'lucide-react';
import { formatINR } from '../../lib/formatters';
import { formatMonthLabel } from '../../lib/monthlySalesService';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  currentTarget: number;
  onSaveTarget: (targetAmount: number) => Promise<void>;
}

export const TargetModal: React.FC<TargetModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  currentTarget,
  onSaveTarget,
}) => {
  const [targetInput, setTargetInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetInput(currentTarget > 0 ? String(currentTarget) : '6000000');
      setError(null);
    }
  }, [isOpen, currentTarget]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetInput.replace(/,/g, '').trim());
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid target amount greater than zero.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSaveTarget(val);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update target. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const periodLabel = formatMonthLabel(year, month);
  const parsedValue = parseFloat(targetInput.replace(/,/g, '') || '0');

  // Quick preset targets
  const presets = [2500000, 5000000, 6000000, 7500000, 10000000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 relative">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Set Monthly Target</h3>
            <p className="text-xs text-slate-500 font-mono">Period: {periodLabel}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Target Revenue (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                ₹
              </span>
              <input
                type="number"
                step="50000"
                min="10000"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="e.g. 6000000"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-sm font-bold text-slate-900"
                autoFocus
              />
            </div>
            {parsedValue > 0 && (
              <p className="text-[11px] text-purple-700 font-mono font-semibold">
                Formatted: {formatINR(parsedValue)}
              </p>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetInput(String(amt))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold font-mono bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  {formatINR(amt)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
