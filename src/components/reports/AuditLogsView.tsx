import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">System Audit Trail</h2>
        <p className="text-xs text-slate-400 mt-1">Immutable security log of all admin, telecaller, and RM actions</p>
      </div>

      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-200">{log.user_name || 'System'}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{log.table_name}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {JSON.stringify(log.new_values || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
