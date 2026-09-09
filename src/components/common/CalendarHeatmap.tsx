import React from 'react';
import { TradingDay } from '../../types';
import { formatINR } from '../../lib/formatters';

interface CalendarHeatmapProps {
  tradingDays: TradingDay[];
  year?: number;
  month?: number; // 0-indexed (0 = Jan, 7 = Aug)
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  tradingDays,
  year = 2026,
  month = 7, // August
}) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const dayMap = new Map<number, TradingDay>();
  tradingDays.forEach((td) => {
    const d = new Date(td.trade_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      dayMap.set(d.getDate(), td);
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const emptyCells = Array.from({ length: (firstDayOfWeek + 6) % 7 }); // Mon start
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <h4 className="text-sm font-bold text-slate-800">
          Trading Activity Heatmap — {monthNames[month]} {year}
        </h4>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Winning Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Losing Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
            <span>No Trade</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="font-semibold text-slate-400 py-1 text-[11px]">
            {day}
          </div>
        ))}

        {emptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8 sm:h-9" />
        ))}

        {daysArray.map((dayNum) => {
          const td = dayMap.get(dayNum);
          let bgClass = 'bg-slate-50 text-slate-400 border border-slate-100';
          let titleText = `Day ${dayNum}: No trade recorded`;

          if (td) {
            if (td.total_profit > 0) {
              bgClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100';
              titleText = `${monthNames[month]} ${dayNum}: Profit ${formatINR(td.total_profit)} (${td.trades_count} trades)`;
            } else if (td.total_profit < 0) {
              bgClass = 'bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100';
              titleText = `${monthNames[month]} ${dayNum}: Loss ${formatINR(td.total_profit)} (${td.trades_count} trades)`;
            } else {
              bgClass = 'bg-amber-50 text-amber-700 border border-amber-200 font-bold hover:bg-amber-100';
              titleText = `${monthNames[month]} ${dayNum}: Break-even (${td.trades_count} trades)`;
            }
          }

          return (
            <div
              key={dayNum}
              title={titleText}
              className={`h-8 sm:h-9 rounded-lg flex flex-col items-center justify-center text-[11px] sm:text-xs transition-all hover:scale-105 cursor-pointer shadow-xs ${bgClass}`}
            >
              <span>{dayNum}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
