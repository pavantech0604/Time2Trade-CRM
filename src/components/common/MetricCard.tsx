import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  isCurrency?: boolean;
  icon: LucideIcon;
  variant?: 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  subtitle,
  isCurrency = true,
  icon: Icon,
  variant = 'neutral',
  onClick,
}) => {
  const formattedValue =
    typeof value === 'number' ? (isCurrency ? formatINR(value) : value.toLocaleString('en-IN')) : value;

  const strVal = String(formattedValue);
  const fontSizeClass =
    strVal.length > 13
      ? 'text-base min-[380px]:text-lg sm:text-xl xl:text-2xl'
      : strVal.length > 10
      ? 'text-lg min-[380px]:text-xl sm:text-2xl xl:text-3xl'
      : 'text-xl min-[380px]:text-2xl sm:text-3xl';

  const getVariantStyles = () => {
    switch (variant) {
      case 'positive':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
          gradient: 'hover:border-emerald-200',
        };
      case 'negative':
        return {
          iconBg: 'bg-rose-50 text-rose-600 border-rose-100/50',
          gradient: 'hover:border-rose-200',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600 border-amber-100/50',
          gradient: 'hover:border-amber-200',
        };
      case 'info':
        return {
          iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-100/50',
          gradient: 'hover:border-cyan-200',
        };
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 border-blue-100/50',
          gradient: 'hover:border-blue-200',
        };
    }
  };

  const { iconBg, gradient } = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 min-w-0 overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : 'hover:shadow-md'
      } ${gradient}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{title}</span>
        <div className={`p-1.5 sm:p-2.5 rounded-xl border shrink-0 ${iconBg}`}>
          <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-2.5 sm:mt-4 flex items-baseline justify-between min-w-0 overflow-hidden">
        <h3
          className={`${fontSizeClass} font-black text-slate-800 tracking-tight truncate leading-tight tabular-nums`}
          title={strVal}
        >
          {formattedValue}
        </h3>
      </div>

      {Boolean(subtitle) && (
        <p className="mt-1 text-[11px] text-slate-400 font-medium truncate" title={subtitle}>
          {subtitle}
        </p>
      )}

      {typeof change !== 'undefined' && (
        <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-[10px] sm:text-xs font-medium">
          <span
            className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded-md ${
              change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {change >= 0 ? `+${change}%` : `${change}%`}
          </span>
          <span className="text-slate-400 truncate">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};
