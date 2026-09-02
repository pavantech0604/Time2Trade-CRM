import React from 'react';
import { TradingDay } from '../../types';
import { formatINR } from '../../lib/calculations';

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
    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-200">
          Trading Activity Heatmap — {monthNames[month]} {year}
        </h4>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
            <span>Winning Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" />
            <span>Losing Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
            <span>No Trade</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="font-semibold text-slate-500 py-1">
            {day}
          </div>
        ))}

        {emptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9" />
        ))}

        {daysArray.map((dayNum) => {
          const td = dayMap.get(dayNum);
          let bgClass = 'bg-slate-800/40 text-slate-500 border border-slate-800/50';
          let titleText = `Day ${dayNum}: No trade recorded`;

          if (td) {
            if (td.total_profit > 0) {
              bgClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold';
              titleText = `Aug ${dayNum}: Profit ${formatINR(td.total_profit)} (${td.trades_count} trades)`;
            } else if (td.total_profit < 0) {
              bgClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold';
              titleText = `Aug ${dayNum}: Loss ${formatINR(td.total_profit)} (${td.trades_count} trades)`;
            } else {
              bgClass = 'bg-slate-700/30 text-slate-300 border border-slate-700/50';
              titleText = `Aug ${dayNum}: Break-even (${td.trades_count} trades)`;
            }
          }

          return (
            <div
              key={dayNum}
              title={titleText}
              className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer ${bgClass}`}
            >
              <span>{dayNum}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
