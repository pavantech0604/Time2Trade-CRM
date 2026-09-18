import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { calculateSalaryDistribution, formatINR } from '../../lib/calculations';
import {
  TrendingUp,
  Users,
  PieChart as PieChartIcon,
  ShieldAlert,
  Info,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Receipt,
  Sparkles,
  Target,
  ArrowUpRight,
  Banknote,
  Calendar,
  Award,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const { payments, users, currentUser, managerAdvances } = useAuth();

  // Active employees
  const activeEmployees = useMemo(() => {
    return users.filter((u) => u.role === 'employee' && u.is_active);
  }, [users]);

  // Approved payments
  const approvedPayments = useMemo(() => {
    return payments.filter((p) => p.status === 'approved');
  }, [payments]);

  // Salary distribution calculation (manager share, employee pool)
  const distribution = useMemo(() => {
    const empIds = activeEmployees.map((e) => e.id);
    return calculateSalaryDistribution(payments, empIds);
  }, [payments, activeEmployees]);

  // Filter advances taken by this specific manager
  const isManager = currentUser?.role === 'manager';
  const myAdvances = useMemo(() => {
    if (!currentUser) return [];
    if (isManager) {
      return managerAdvances.filter(
        (a) =>
          a.manager_id === currentUser.id ||
          (currentUser.name &&
            a.manager_name &&
            a.manager_name.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase()))
      );
    }
    // If admin is previewing this page
    return managerAdvances;
  }, [managerAdvances, currentUser, isManager]);

  const totalAdvancesTaken = useMemo(() => {
    return myAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  }, [myAdvances]);

  const netManagerPayable = distribution.managerShare - totalAdvancesTaken;

  // Bar chart data: sales per employee
  const barChartData = useMemo(() => {
    return distribution.employeeDistributions.map((d) => {
      const emp = activeEmployees.find((e) => e.id === d.employeeId);
      return {
        name: emp?.name || 'Employee',
        sales: d.salesTotal,
        salary: d.salary,
      };
    });
  }, [distribution, activeEmployees]);

  // Split pie chart data (Manager Share vs Company Retained Pool)
  const pieChartData = useMemo(() => {
    return [
      { name: "Manager's Revenue Share", value: distribution.managerShare, color: '#8b5cf6' },
      { name: 'Company Retained Pool', value: distribution.employeePool, color: '#3b82f6' },
    ];
  }, [distribution]);

  const COLORS = ['#8b5cf6', '#3b82f6'];

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Management Overview
              </h2>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Overall platform sales volume, team performance breakdown, and salary advance ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Revenue Share Active
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards: Overall Sales, Manager Share, Advances Taken, Net Payable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Overall Platform Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Overall Platform Sales</span>
            <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight truncate leading-tight" title={formatINR(distribution.totalSales)}>
            {formatINR(distribution.totalSales)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {approvedPayments.length} verified client transaction{approvedPayments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* 2. Manager Revenue Share */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/30 border border-purple-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1 truncate">
              Manager Revenue Share
              <span title="Manager receives executive revenue share from overall verified client payments.">
                <Info className="w-3 h-3 text-purple-500 cursor-help shrink-0" />
              </span>
            </span>
            <DollarSign className="w-4 h-4 text-purple-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 font-mono tracking-tight truncate leading-tight" title={formatINR(distribution.managerShare)}>
            {formatINR(distribution.managerShare)}
          </div>
          <p className="text-[11px] text-purple-600 font-medium truncate">Earned from platform sales</p>
        </div>

        {/* 3. Salary Advances Taken */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Advances Taken</span>
            <Banknote className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight truncate leading-tight" title={formatINR(totalAdvancesTaken)}>
            {formatINR(totalAdvancesTaken)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {myAdvances.length} advance payment{myAdvances.length !== 1 ? 's' : ''} received
          </p>
        </div>

        {/* 4. Net Manager Payable */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 border border-emerald-200 rounded-2xl p-5 space-y-1.5 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="truncate">Net Manager Payable</span>
            <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate leading-tight ${
              netManagerPayable >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
            title={formatINR(netManagerPayable)}
          >
            {formatINR(netManagerPayable)}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium truncate">
            Revenue Share − Advances Taken
          </p>
        </div>
      </div>

      {/* Revenue Share Formula Explainer Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Compensation Distribution Rule
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl font-medium">
            Verified client collections are partitioned between Executive Management Revenue Share and the Company Retained Pool, with team salaries disbursed in direct proportion to verified individual sales.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shrink-0 font-mono text-xs">
          <span className="font-bold text-purple-700">Management Allocation</span>
          <span className="text-slate-400">•</span>
          <span className="font-bold text-blue-700">Team Pool</span>
        </div>
      </div>

      {/* My Salary Advances Ledger Section (Manager can review advances received) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-blue-50/50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {isManager ? 'My Salary Advances Ledger' : 'Manager Advances Ledger'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                  {myAdvances.length} Advance Disbursement{myAdvances.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Record of salary advances received by your account, automatically deducted from your earned revenue share
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start sm:self-auto">
            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-right">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Total Advances Received</span>
              <span className="text-sm font-black font-mono text-slate-900">{formatINR(totalAdvancesTaken)}</span>
            </div>
          </div>
        </div>

        {myAdvances.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No Salary Advances Recorded</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              You have not received any salary advances. Your full Manager Revenue Share balance remains payable.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Advances Card Stack */}
            <div className="md:hidden block divide-y divide-slate-100">
              {myAdvances.map((adv) => (
                <div key={adv.id} className="p-4 space-y-2.5 bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{adv.notes || 'Salary Advance'}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {new Date(adv.date || adv.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="text-sm font-black font-mono text-slate-900 shrink-0 tabular-nums">
                      {formatINR(adv.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className="text-slate-400 font-medium">Settlement Status:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Deducted from Share
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Advances Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-3 px-4">Disbursement Date</th>
                    <th className="py-3 px-4">Purpose / Note</th>
                    <th className="py-3 px-4 text-center">Settlement Status</th>
                    <th className="py-3 px-4 text-right">Advance Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {myAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {new Date(adv.date || adv.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {adv.notes || 'Salary Advance'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Deducted from Share
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(adv.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Analytics Row: Bar Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales per Employee Bar Chart */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Verified Sales & Salary by Employee</h3>
              <p className="text-xs text-slate-500 font-medium">
                Sales generated vs. calculated salary allocation
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active employee sales data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                    }}
                    formatter={(val: any, name: string) => [
                      formatINR(Number(val)),
                      name === 'sales' ? 'Verified Sales' : 'Calculated Salary',
                    ]}
                  />
                  <Bar dataKey="sales" name="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salary" name="salary" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue Allocation Donut Chart */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">Revenue Allocation</h3>
              <PieChartIcon className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 mb-4 font-medium">Management Share & Company Retained Pool</p>

            <div className="h-52 w-full flex items-center justify-center">
              {distribution.totalSales === 0 ? (
                <div className="text-xs text-slate-400">No approved collections recorded yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), 'Amount']}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="font-semibold text-slate-700">Manager Revenue Share</span>
              </div>
              <span className="font-mono font-bold text-purple-700">
                {formatINR(distribution.managerShare)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-700">Company Retained Pool</span>
              </div>
              <span className="font-mono font-bold text-blue-700">
                {formatINR(distribution.employeePool)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Salary Distribution Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Employee Salary Distribution Table
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Calculated proportionally from each employee's verified contribution to total sales
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {distribution.employeeDistributions.length} Staff Members
          </span>
        </div>

        {distribution.employeeDistributions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4 text-right">Verified Sales Total</th>
                  <th className="py-3.5 px-4 text-center">Sales Contribution Tier</th>
                  <th className="py-3.5 px-4">Proportional Share Bar</th>
                  <th className="py-3.5 px-4 text-right">Calculated Salary Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {distribution.employeeDistributions.map((dist) => {
                  const emp = activeEmployees.find((e) => e.id === dist.employeeId);
                  return (
                    <tr key={dist.employeeId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                            {emp?.name.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{emp?.name || 'Employee'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        {formatINR(dist.salesTotal)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {dist.salesTotal > 0 ? 'Active Contributor' : 'No Sales'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 w-48">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, dist.percentage)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-xs">
                        {formatINR(dist.salary)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
