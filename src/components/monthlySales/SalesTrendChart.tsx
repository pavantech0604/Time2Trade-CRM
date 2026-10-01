import React, { useState } from 'react';
import { DailySalesTrendPoint } from '../../types';
import { formatINR, formatINRCompact } from '../../lib/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';

interface SalesTrendChartProps {
  data: DailySalesTrendPoint[];
  monthLabel: string;
  isCurrentMonth: boolean;
  isLoading?: boolean;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  data,
  monthLabel,
  isCurrentMonth,
  isLoading = false,
}) => {
  const [metricType, setMetricType] = useState<'revenue' | 'count'>('revenue');

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs h-72 animate-pulse flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-4 w-48 bg-slate-100 rounded" />
          <div className="h-7 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="w-full h-48 bg-slate-50 rounded-xl" />
      </div>
    );
  }

  // Calculate month total to detect empty state
  const totalRecordedRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalRecordedCount = data.reduce((sum, d) => sum + d.salesCount, 0);
  const hasRecordedActivity = totalRecordedRevenue > 0 || totalRecordedCount > 0;

  // Custom Tooltip renderer
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const item: DailySalesTrendPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/60 shadow-xl text-xs space-y-1 z-50">
          <div className="flex items-center justify-between gap-4 border-b border-slate-700/80 pb-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3 h-3 text-blue-400" />
              {item.formattedDate}
            </span>
            {item.isToday && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase font-bold">
                Today
              </span>
            )}
            {item.isFuture && (
              <span className="px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 font-mono text-[9px] uppercase">
                Upcoming
              </span>
            )}
          </div>

          <div className="space-y-0.5 pt-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Verified Revenue:</span>
              <span className="font-black text-emerald-400 font-mono">
                {formatINR(item.revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Transactions:</span>
              <span className="font-bold text-white font-mono">
                {item.salesCount} {item.salesCount === 1 ? 'sale' : 'sales'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Daily Sales Trend — {monthLabel}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Day-by-day distribution of verified revenue across the calendar month
          </p>
        </div>

        {/* Metric Selector Toggle (Revenue vs Sales Count) */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 self-start sm:self-auto border border-slate-200/70">
          <button
            type="button"
            onClick={() => setMetricType('revenue')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metricType === 'revenue'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revenue (₹)
          </button>
          <button
            type="button"
            onClick={() => setMetricType('count')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metricType === 'count'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Count
          </button>
        </div>
      </div>

      {/* Chart Canvas or Polite Empty State */}
      {!hasRecordedActivity ? (
        <div className="h-64 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-700">
            No sales recorded for {monthLabel} yet
          </h4>
          <p className="text-[11px] text-slate-400 max-w-sm">
            {isCurrentMonth
              ? 'As clients submit payment proofs and accounts verifies transactions, daily trend activity will appear here automatically.'
              : 'There are no historical sales recorded for this reporting period.'}
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="countTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                interval={Math.ceil(data.length / 16)}
                tickFormatter={(day) => `${day}`}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => (metricType === 'revenue' ? formatINRCompact(v) : `${v}`)}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey={metricType === 'revenue' ? 'revenue' : 'salesCount'}
                stroke={metricType === 'revenue' ? '#2563eb' : '#10b981'}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={metricType === 'revenue' ? 'url(#salesTrendGradient)' : 'url(#countTrendGradient)'}
                activeDot={{ r: 5, fill: metricType === 'revenue' ? '#2563eb' : '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer Notes */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1 font-mono">
          <Info className="w-3 h-3 text-slate-400" />
          {data.length} calendar days ({monthLabel})
        </span>
        <span className="font-mono">
          Total: {formatINR(totalRecordedRevenue)} ({totalRecordedCount} sales)
        </span>
      </div>
    </div>
  );
};
