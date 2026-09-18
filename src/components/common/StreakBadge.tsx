import React from 'react';

interface StreakBadgeProps {
  streak?: number;
  paymentCount?: number;
  activityLevel?: 'high' | 'medium' | 'low';
  longestStreak?: number;
  weeklyHistory?: boolean[]; // Array of 7 booleans for Mon-Sun: true = profit day, false = loss/no-trade
  showWeeklyStrip?: boolean;
}

/**
 * Snapchat-Style Streak Badge:
 * Ultra-clean, iconic gamified streak display featuring the fire emoji
 * alongside the bold streak counter, exactly like Snapchat.
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak = 0,
  paymentCount,
  weeklyHistory = [true, true, true, true, true, false, false],
  showWeeklyStrip = false,
}) => {
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Effective count: takes payment count or trading streak, whichever is higher, or 0
  const count = Math.max(paymentCount || 0, streak || 0);
  const isActive = count > 0;
  const isCentury = count >= 100;

  return (
    <div className="inline-flex flex-col gap-1 items-start whitespace-nowrap select-none">
      {/* Snapchat Streak Pill */}
      <div
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-150 hover:scale-105 cursor-default ${
          isActive
            ? count >= 5
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 text-slate-900 shadow-xs hover:border-orange-400 hover:shadow-sm'
              : 'bg-amber-50/90 border-amber-200/90 text-slate-900 shadow-xs hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-sm'
            : 'bg-slate-100/70 border-slate-200/80 text-slate-400'
        }`}
        title={`${count} consecutive streak`}
      >
        {/* Snapchat Fire / Milestone Emoji */}
        <span
          className={`text-sm leading-none transition-transform duration-150 group-hover:scale-110 select-none ${
            !isActive ? 'opacity-40 grayscale' : ''
          }`}
          style={{
            filter: isActive ? 'drop-shadow(0 1px 2px rgba(234, 88, 12, 0.35))' : 'none',
          }}
        >
          {isCentury ? '💯' : '🔥'}
        </span>

        {/* Snapchat Bold Streak Number */}
        <span
          className={`text-xs font-black tracking-tight ${
            isActive ? 'text-slate-900 font-sans' : 'text-slate-400 font-semibold'
          }`}
        >
          {count}
        </span>
      </div>

      {/* Optional Weekly Activity History Strip */}
      {showWeeklyStrip && (
        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-200 justify-between w-full mt-0.5">
          {daysOfWeek.map((day, idx) => {
            const isWinning = weeklyHistory[idx] ?? false;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold text-slate-500">{day}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWinning ? 'bg-emerald-500 shadow-xs' : 'bg-slate-200'
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

