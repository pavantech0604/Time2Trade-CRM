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
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          gradient: 'hover:border-emerald-500/30',
        };
      case 'negative':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          gradient: 'hover:border-rose-500/30',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          gradient: 'hover:border-amber-500/30',
        };
      case 'info':
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          gradient: 'hover:border-cyan-500/30',
        };
      default:
        return {
          iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          gradient: 'hover:border-blue-500/30',
        };
    }
  };

  const { iconBg, gradient } = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-slate-800/80 shadow-lg shadow-black/20 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${gradient}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 sm:p-2.5 rounded-xl border shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4 sm:w-5 h-5" />
        </div>
      </div>

      <div className="mt-2.5 sm:mt-3 flex items-baseline justify-between">
        <h3 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">{formattedValue}</h3>
      </div>

      {typeof change !== 'undefined' && (
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs">
          <span
            className={`inline-flex items-center font-bold ${
              change >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {change >= 0 ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5" />}
            {change >= 0 ? `+${change}%` : `${change}%`}
          </span>
          <span className="text-slate-500 truncate">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};
