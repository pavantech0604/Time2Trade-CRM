import React, { useState } from 'react';
import {
  Clock,
  Users,
  CheckCircle2,
  Coffee,
  Utensils,
  Moon,
  Download,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserPresenceStatus, UserRole, AttendanceLog, UserPresence } from '../../types';

export const AttendanceDashboard: React.FC = () => {
  const { presenceList, attendanceLogs, users } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  // Filter presence list
  const filteredPresence = presenceList.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.current_status === statusFilter;
    const matchesRole = roleFilter === 'all' || p.user_role === roleFilter;
    const matchesSearch =
      p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  // Metrics
  const totalStaff = presenceList.length;
  const onlineCount = presenceList.filter((p) => p.current_status === 'online').length;
  const breakCount = presenceList.filter((p) => p.current_status === 'on_break').length;
  const lunchCount = presenceList.filter((p) => p.current_status === 'on_lunch').length;
  const offlineCount = presenceList.filter((p) => p.current_status === 'offline').length;
  const lateCount = presenceList.filter((p) => p.is_late).length;

  const statusColors: Record<
    UserPresenceStatus,
    { label: string; bg: string; text: string; dot: string; icon: any }
  > = {
    online: {
      label: 'Online',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
    },
    on_break: {
      label: 'On Break',
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      icon: Coffee,
    },
    on_lunch: {
      label: 'On Lunch',
      bg: 'bg-purple-500/10 border-purple-500/30',
      text: 'text-purple-400',
      dot: 'bg-purple-400',
      icon: Utensils,
    },
    offline: {
      label: 'Offline',
      bg: 'bg-slate-800/40 border-slate-700/60',
      text: 'text-slate-400',
      dot: 'bg-slate-600',
      icon: Moon,
    },
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Employee Name',
      'Email',
      'Role',
      'Current Status',
      'Login Time',
      'Logout Time',
      'Total Break (Mins)',
      'Total Lunch (Mins)',
      'Punctuality',
    ];

    const rows = filteredPresence.map((p) => [
      `"${p.user_name}"`,
      `"${p.user_email}"`,
      `"${p.user_role}"`,
      `"${p.current_status}"`,
      `"${p.today_login_time ? new Date(p.today_login_time).toLocaleTimeString() : 'N/A'}"`,
      `"${p.today_logout_time ? new Date(p.today_logout_time).toLocaleTimeString() : 'N/A'}"`,
      p.total_break_minutes,
      p.total_lunch_minutes,
      `"${p.is_late ? 'Late (>9:30 AM)' : 'On Time'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `time2trade_attendance_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-emerald-500" />
            Live Team Attendance & Punctuality Board
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time employee activity tracking, break/lunch timers, and punctuality monitoring.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export Attendance CSV
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-800">{totalStaff}</p>
          <p className="text-[10px] text-slate-400 font-mono">Team size</p>
        </div>

        <div className="bg-white border border-emerald-250 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Online</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-xl font-black text-emerald-700">{onlineCount}</p>
          <p className="text-[10px] text-emerald-600 font-mono font-medium">Actively working</p>
        </div>

        <div className="bg-white border border-amber-250 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>On Break</span>
            <Coffee className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-800">{breakCount}</p>
          <p className="text-[10px] text-amber-600 font-mono font-medium">Short break</p>
        </div>

        <div className="bg-white border border-purple-250 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>On Lunch</span>
            <Utensils className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-800">{lunchCount}</p>
          <p className="text-[10px] text-purple-650 font-mono font-medium">Lunch session</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Offline</span>
            <Moon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-700">{offlineCount}</p>
          <p className="text-[10px] text-slate-400 font-mono">Not signed in</p>
        </div>

        <div className="bg-white border border-rose-250 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Late Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-rose-800">{lateCount}</p>
          <p className="text-[10px] text-rose-600 font-mono font-medium">After 09:30 AM</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee presence..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Live Status</option>
            <option value="online">Online</option>
            <option value="on_break">On Break</option>
            <option value="on_lunch">On Lunch</option>
            <option value="offline">Offline</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      {/* Real-time Team Cards Grid */}
      <div className="space-y-3 font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          Real-Time Team Presence Grid
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresence.map((p) => {
            const cfg = statusColors[p.current_status] || statusColors.offline;
            const Icon = cfg.icon;

            return (
              <div
                key={p.user_id}
                className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 hover:border-slate-350 transition-all shadow-sm"
              >
                {/* Top info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                      {p.user_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs">{p.user_name}</h3>
                      <p className="text-[10px] font-mono text-slate-500 capitalize mt-0.5">
                        {p.user_role.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${cfg.bg.replace(/\/10/g, '/20').replace(/bg-emerald-500/g, 'bg-emerald-50').replace(/bg-amber-500/g, 'bg-amber-50').replace(/bg-purple-500/g, 'bg-purple-50').replace(/bg-slate-700/g, 'bg-slate-50')} ${cfg.text.replace(/text-emerald-400/g, 'text-emerald-800').replace(/text-amber-400/g, 'text-amber-800').replace(/text-purple-400/g, 'text-purple-800').replace(/text-slate-400/g, 'text-slate-650')}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot.replace(/bg-emerald-400/g, 'bg-emerald-500').replace(/bg-amber-400/g, 'bg-amber-500').replace(/bg-purple-400/g, 'bg-purple-500')}`} />
                    {cfg.label}
                  </span>
                </div>

                {/* Timers & Punctuality */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-650">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">First Login:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {p.today_login_time
                        ? new Date(p.today_login_time).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Not logged in'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Total Break Time:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {p.total_break_minutes} mins
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Total Lunch Time:</span>
                    <span className="font-mono font-bold text-purple-700">
                      {p.total_lunch_minutes} mins
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Punctuality:</span>
                    {p.is_late ? (
                      <span className="text-rose-800 font-bold text-[10px] font-mono uppercase bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 shadow-sm">
                        Late Arrival
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-bold text-[10px] font-mono uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-250 shadow-sm">
                        On Time
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="space-y-3 pt-4 font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Recent Attendance & Break Event Logs
        </h2>

        {/* Mobile View: Cards */}
        <div className="md:hidden block space-y-2.5">
          {attendanceLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center text-slate-500 shadow-sm text-xs">
              No recent event logs recorded.
            </div>
          ) : (
            attendanceLogs.map((log) => (
              <div 
                key={log.id} 
                className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{log.user_name || 'Staff'}</h4>
                    <span className="text-[10px] text-slate-500 capitalize block font-mono mt-0.5">
                      {log.user_role?.replace(/_/g, ' ') || 'Staff'}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-slate-500">
                    {new Date(log.event_time).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-bold">Event Type</span>
                    <span className="mt-0.5 block">
                      {log.event_type === 'login' && <span className="text-emerald-700 font-bold">● Login Recorded</span>}
                      {log.event_type === 'logout' && <span className="text-slate-500 font-bold">● Logout Recorded</span>}
                      {log.event_type === 'break_start' && <span className="text-amber-700 font-bold">☕ Break Started</span>}
                      {log.event_type === 'break_end' && <span className="text-emerald-700 font-bold">✓ Break Ended</span>}
                      {log.event_type === 'lunch_start' && <span className="text-purple-700 font-bold">🍽️ Lunch Started</span>}
                      {log.event_type === 'lunch_end' && <span className="text-emerald-700 font-bold">✓ Lunch Ended</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[8px] font-bold">Transition</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">
                      {log.status_before || 'offline'} →{' '}
                      <strong className="text-slate-800 font-extrabold">{log.status_after || 'online'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091A2F]/5 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-500">Staff Member</th>
                  <th className="py-3 px-4 font-semibold text-slate-500">Role</th>
                  <th className="py-3 px-4 font-semibold text-slate-500">Event Type</th>
                  <th className="py-3 px-4 font-semibold text-slate-500">Transition</th>
                  <th className="py-3 px-4 font-semibold text-slate-500">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 font-mono text-[11px]">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/40">
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      {log.user_name || 'Staff'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 capitalize">
                      {log.user_role?.replace(/_/g, ' ') || 'Staff'}
                    </td>
                    <td className="py-3 px-4">
                      {log.event_type === 'login' && (
                        <span className="text-emerald-700 font-bold">● Login Recorded</span>
                      )}
                      {log.event_type === 'logout' && (
                        <span className="text-slate-500 font-bold">● Logout Recorded</span>
                      )}
                      {log.event_type === 'break_start' && (
                        <span className="text-amber-700 font-bold">☕ Break Started</span>
                      )}
                      {log.event_type === 'break_end' && (
                        <span className="text-emerald-700 font-bold">✓ Break Ended</span>
                      )}
                      {log.event_type === 'lunch_start' && (
                        <span className="text-purple-700 font-bold">🍽️ Lunch Started</span>
                      )}
                      {log.event_type === 'lunch_end' && (
                        <span className="text-emerald-700 font-bold">✓ Lunch Ended</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">
                      {log.status_before || 'offline'} →{' '}
                      <strong className="text-slate-800">{log.status_after || 'online'}</strong>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.event_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
