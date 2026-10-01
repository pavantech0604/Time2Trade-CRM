import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UnifiedPeriod,
  ALL_TIME_PERIOD,
  createReportingPeriod,
  toUnifiedPeriod,
  getAvailableReportingPeriods,
} from '../../lib/reportingPeriodService';
import {
  CalendarDays,
  ChevronDown,
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  Check,
} from 'lucide-react';

interface ReportingPeriodSelectorProps {
  periods?: UnifiedPeriod[];
  selectedPeriod: UnifiedPeriod;
  onSelectPeriod?: (period: UnifiedPeriod) => void;
  onPeriodChange?: (period: UnifiedPeriod) => void;
  includeAllTime?: boolean;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const ReportingPeriodSelector: React.FC<ReportingPeriodSelectorProps> = ({
  periods,
  selectedPeriod,
  onSelectPeriod,
  onPeriodChange,
  includeAllTime = false,
  isLoading = false,
  className = '',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fallback safe periods if not explicitly provided
  const effectivePeriods: UnifiedPeriod[] = React.useMemo(() => {
    if (periods && periods.length > 0) return periods;
    return getAvailableReportingPeriods([], '2026-09-01').map(toUnifiedPeriod);
  }, [periods]);

  const emitSelect = (period: UnifiedPeriod) => {
    if (onSelectPeriod) onSelectPeriod(period);
    if (onPeriodChange) onPeriodChange(period);
  };

  // Fallback safe year for calendar picker
  const activeYear = selectedPeriod.year > 0 ? selectedPeriod.year : new Date().getFullYear();
  const [pickerYear, setPickerYear] = useState(activeYear);

  useEffect(() => {
    if (selectedPeriod.year > 0) {
      setPickerYear(selectedPeriod.year);
    }
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

  const currentPeriod = effectivePeriods.find((p) => p.isCurrent) || effectivePeriods[0];
  const isViewingCurrent = selectedPeriod.isCurrent;
  const isViewingAllTime = selectedPeriod.isAllTime;

  // Available years from periods
  const availableYears = Array.from(
    new Set(effectivePeriods.filter((p) => p.year > 0).map((p) => p.year))
  ).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  const handleSelectMonth = (monthNum: number) => {
    const existing = effectivePeriods.find((p) => p.year === pickerYear && p.month === monthNum);
    if (existing) {
      emitSelect(existing);
    } else {
      const created = toUnifiedPeriod(createReportingPeriod(pickerYear, monthNum));
      emitSelect(created);
    }
    setIsOpen(false);
  };

  const handleSelectAllTime = () => {
    emitSelect(ALL_TIME_PERIOD);
    setIsOpen(false);
  };

  const isSmall = size === 'sm';

  return (
    <div className={`relative font-sans z-30 ${className}`} ref={dropdownRef}>
      {/* ── Compact Executive Month Selector Pill ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`group flex items-center gap-2 rounded-xl border transition-all duration-150 cursor-pointer active:scale-95 ${
          isSmall ? 'h-8 px-2.5 text-xs' : 'h-9 sm:h-10 px-3 sm:px-3.5 text-xs sm:text-sm'
        } ${
          isOpen
            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/10 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* Subtle Icon Box */}
        <div
          className={`rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isSmall ? 'w-5 h-5' : 'w-6 h-6'
          } ${
            isViewingAllTime
              ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
              : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
          }`}
        >
          {isViewingAllTime ? (
            <InfinityIcon className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : (
            <CalendarDays className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          )}
        </div>

        {/* Month & Year Label */}
        <span className="font-extrabold text-slate-800 tracking-tight whitespace-nowrap group-hover:text-blue-700 transition-colors">
          {selectedPeriod.label}
        </span>

        {/* Status Badge */}
        {isViewingAllTime ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 font-mono shrink-0">
            Cumulative
          </span>
        ) : isViewingCurrent ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 font-mono shrink-0">
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

      {/* ── Calendar Popover ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-[100] p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
              Reporting Period
            </span>

            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
              {availableYears.length > 1 ? (
                <select
                  value={pickerYear}
                  onChange={(e) => setPickerYear(Number(e.target.value))}
                  className="bg-transparent font-extrabold text-[11px] font-mono text-slate-800 cursor-pointer focus:outline-none"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-extrabold text-[11px] font-mono text-slate-800">
                  {pickerYear}
                </span>
              )}
            </div>
          </div>

          {/* 12-Month Calendar Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES_SHORT.map((monthAbbr, idx) => {
              const monthNum = idx + 1;
              const matchingPeriod = effectivePeriods.find(
                (p) => p.year === pickerYear && p.month === monthNum
              );

              const isSelected =
                !isViewingAllTime &&
                selectedPeriod.year === pickerYear &&
                selectedPeriod.month === monthNum;

              const isCurrent =
                currentPeriod.year === pickerYear && currentPeriod.month === monthNum;

              // Disallow future months beyond current month
              const isFuture =
                pickerYear > currentPeriod.year ||
                (pickerYear === currentPeriod.year && monthNum > currentPeriod.month);

              return (
                <button
                  key={monthAbbr}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleSelectMonth(monthNum)}
                  className={`relative py-2 px-1 rounded-xl text-center font-bold text-xs transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                      : isFuture
                      ? 'text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-40'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <span className="block">{monthAbbr}</span>

                  {/* Micro indicator for current live month */}
                  {isCurrent && !isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional All-Time Selection Option */}
          {includeAllTime && (
            <div className="pt-2.5 mt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSelectAllTime}
                className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  isViewingAllTime
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-600/30'
                    : 'bg-purple-50 hover:bg-purple-100/80 text-purple-900 border border-purple-200/70 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-2">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>All Time (Cumulative)</span>
                </div>
                {isViewingAllTime && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
