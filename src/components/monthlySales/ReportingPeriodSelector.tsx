import React, { useState, useRef, useEffect } from 'react';
import { MonthlyReportingPeriod } from '../../types';
import { createReportingPeriod } from '../../lib/monthlySalesService';
import {
  CalendarDays,
  ChevronDown,
  Sparkles,
  Clock,
} from 'lucide-react';

interface ReportingPeriodSelectorProps {
  periods: MonthlyReportingPeriod[];
  selectedPeriod: MonthlyReportingPeriod;
  onSelectPeriod: (period: MonthlyReportingPeriod) => void;
  isLoading?: boolean;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const ReportingPeriodSelector: React.FC<ReportingPeriodSelectorProps> = ({
  periods,
  selectedPeriod,
  onSelectPeriod,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedPeriod.year);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync picker year when selectedPeriod changes
  useEffect(() => {
    setPickerYear(selectedPeriod.year);
  }, [selectedPeriod.year]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentPeriod = periods.find((p) => p.isCurrent) || periods[0];
  const isViewingCurrent = selectedPeriod.isCurrent;

  return (
    <div className="relative font-sans z-30" ref={dropdownRef}>
      {/* ── Compact Executive Month Selector Pill ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`group h-10 px-3.5 flex items-center gap-2.5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/10 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* Subtle Icon Box */}
        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <CalendarDays className="w-3.5 h-3.5" />
        </div>

        {/* Single-Line Month & Year Label */}
        <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight whitespace-nowrap group-hover:text-blue-700 transition-colors">
          {selectedPeriod.label}
        </span>

        {/* Compact Status Pill */}
        {isViewingCurrent ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 font-mono shrink-0">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            Archive
          </span>
        )}

        {/* Small Chevron Down Indicator */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ml-0.5 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* ── Compact & Polished 12-Month Calendar Popover ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-[100] p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Select Month
            </span>

            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
              <span className="font-extrabold text-[11px] font-mono text-slate-800">
                {pickerYear}
              </span>
            </div>
          </div>

          {/* 12-Month Calendar Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES_SHORT.map((monthAbbr, idx) => {
              const monthNum = idx + 1;
              const matchingPeriod = periods.find(
                (p) => p.year === pickerYear && p.month === monthNum
              );

              const isSelected =
                selectedPeriod.year === pickerYear && selectedPeriod.month === monthNum;

              const isCurrent =
                currentPeriod.year === pickerYear && currentPeriod.month === monthNum;

              const isFuture =
                pickerYear > currentPeriod.year ||
                (pickerYear === currentPeriod.year && monthNum > currentPeriod.month);

              const targetPeriod =
                matchingPeriod ||
                (!isFuture ? createReportingPeriod(pickerYear, monthNum) : null);
              const isClickable = Boolean(targetPeriod) && !isFuture;

              return (
                <button
                  key={monthAbbr}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (targetPeriod) {
                      onSelectPeriod(targetPeriod);
                      setIsOpen(false);
                    }
                  }}
                  className={`relative py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/20 scale-[1.03]'
                      : isFuture
                      ? 'bg-slate-50/40 text-slate-300 cursor-not-allowed border border-dashed border-slate-100 opacity-40'
                      : 'bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/70 shadow-2xs hover:scale-[1.02]'
                  }`}
                >
                  <span className="tracking-tight text-xs">{monthAbbr}</span>

                  {isCurrent && (
                    <span
                      className={`text-[7px] font-mono uppercase font-black px-1 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Live
                    </span>
                  )}

                  {!isCurrent && isSelected && (
                    <span className="text-[7px] font-mono uppercase font-bold text-white/80">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Return to Current Month Button */}
          {!isViewingCurrent && (
            <div className="pt-2.5 mt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onSelectPeriod(currentPeriod);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Current Month ({currentPeriod.label})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
