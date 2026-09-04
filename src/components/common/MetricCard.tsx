import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR } from '../../lib/calculations';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
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
  isCurrency = true,
  icon: Icon,
  variant = 'neutral',
  onClick,
}) => {
  const formattedValue =
    typeof value === 'number' ? (isCurrency ? formatINR(value) : value.toLocaleString('en-IN')) : value;

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
      className={`bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : 'hover:shadow-md'
      } ${gradient}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        <div className={`p-2 sm:p-2.5 rounded-xl border shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
        <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">{formattedValue}</h3>
      </div>

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
