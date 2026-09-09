import React from 'react';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
  longestStreak?: number;
  weeklyHistory?: boolean[]; // Array of 7 booleans for Mon-Sun: true = profit day, false = loss/no-trade
  showWeeklyStrip?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  weeklyHistory = [true, true, true, true, true, false, false],
  showWeeklyStrip = false,
}) => {
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
        <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse fill-amber-500" />
        <span>{streak}-Day Streak</span>
      </div>

      {showWeeklyStrip && (
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-200 justify-between">
          {daysOfWeek.map((day, idx) => {
            const isWinning = weeklyHistory[idx] ?? false;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold text-slate-500">{day}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWinning
                      ? 'bg-emerald-500 shadow-xs'
                      : 'bg-slate-200'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
