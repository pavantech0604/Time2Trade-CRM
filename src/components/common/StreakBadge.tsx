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
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5">
        <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse fill-amber-500" />
        <span>{streak}-Day Streak</span>
      </div>

      {showWeeklyStrip && (
        <div className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 justify-between">
          {daysOfWeek.map((day, idx) => {
            const isWinning = weeklyHistory[idx] ?? false;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400">{day}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWinning
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-slate-700/60'
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
