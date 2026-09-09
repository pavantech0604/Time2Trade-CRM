import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  ChevronRight,
  Sparkles,
  X,
  Loader2,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole, ApprovalStatus } from '../../types';

export const EmployeeManagement: React.FC = () => {
  const {
    users,
    currentUser,
    assignRoleAndApprove,
    rejectEmployee,
    toggleEmployeeActive,
    adminResetEmployeePassword,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'assign' | 'reject' | 'details' | 'reset_password' | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [rejectReason, setRejectReason] = useState('');
  const [tempPasswordToAssign, setTempPasswordToAssign] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter users
  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesApproval =
        approvalFilter === 'all'
          ? true
          : approvalFilter === 'pending_admin_review'
          ? u.approval_status === 'pending_admin_review' ||
            (u.role === 'pending' && u.approval_status !== 'rejected' && u.approval_status !== 'approved')
          : (u.approval_status || 'approved') === approvalFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active !== false && u.approval_status !== 'rejected') ||
        (statusFilter === 'inactive' && (u.is_active === false || u.approval_status === 'rejected'));

      return matchesSearch && matchesRole && matchesApproval && matchesStatus;
    });

  // KPIs
  const realUsers = users;
  const totalEmployees = realUsers.length;
  const pendingReviews = realUsers.filter(
    (u) =>
      u.approval_status === 'pending_admin_review' ||
      (u.role === 'pending' && u.approval_status !== 'rejected' && u.approval_status !== 'approved')
  ).length;
  const approvedStaff = realUsers.filter((u) => u.approval_status === 'approved').length;
  const activeStaff = users.filter((u) => u.is_active !== false && u.approval_status === 'approved').length;

  const handleOpenAssignModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role === 'pending' ? 'employee' : user.role);
    setModalMode('assign');
  };

  const handleOpenRejectModal = (user: User) => {
    setSelectedUser(user);
    setRejectReason('Failed background/phone verification check.');
    setModalMode('reject');
  };

  const handleConfirmAssign = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await assignRoleAndApprove(selectedUser.id, selectedRole);
      showToast(`Approved ${selectedUser.name} as ${selectedRole.replace(/_/g, ' ').toUpperCase()}`);
      setModalMode(null);
      setSelectedUser(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await rejectEmployee(selectedUser.id, rejectReason.trim());
      showToast(`Rejected registration for ${selectedUser.name}`);
      setModalMode(null);
      setSelectedUser(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const nextState = user.is_active === false;
    await toggleEmployeeActive(user.id, nextState);
    showToast(`${user.name} is now ${nextState ? 'Activated' : 'Deactivated'}`);
  };

  const handleOpenResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    const firstName = user.name.split(' ')[0].replace(/[^A-Za-z]/g, '');
    setTempPasswordToAssign(`T2T@${firstName || 'Staff'}2026`);
    setCopiedPassword(false);
    setModalMode('reset_password');
  };

  const handleCopyTempPassword = () => {
    if (!tempPasswordToAssign) return;
    navigator.clipboard.writeText(tempPasswordToAssign);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleGenerateRandomKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setTempPasswordToAssign(`T2T#${code}`);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser || !tempPasswordToAssign.trim()) return;
    setActionLoading(true);
    try {
      const res = await adminResetEmployeePassword(selectedUser.id, tempPasswordToAssign.trim());
      showToast(res.message);
      setModalMode(null);
      setSelectedUser(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            Staff Security Directory
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage access controls, assign roles, and audit employee activities.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800">{totalEmployees}</p>
          <p className="text-[10px] text-slate-400 font-mono">Registered across database</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-800">{pendingReviews}</p>
          <p className="text-[10px] text-amber-600 font-mono font-medium">Requires role assignment</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Approved Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{approvedStaff}</p>
          <p className="text-[10px] text-slate-400 font-mono">Role validated accounts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Active Operators</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800">{activeStaff}</p>
          <p className="text-[10px] text-slate-400 font-mono">Currently authorized to log in</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Approval Filter */}
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Approvals</option>
            <option value="pending_admin_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
            <option value="pending">Pending Role</option>
          </select>

          {/* Active Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Status</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Employees List / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No employees found.</div>
          ) : (
            filteredUsers.map((user) => {
              const isRejected = user.approval_status === 'rejected';
              const isApproved = user.approval_status === 'approved';
              const isPending =
                !isApproved &&
                !isRejected &&
                (user.approval_status === 'pending_admin_review' || user.role === 'pending');
              const isActive = user.is_active !== false && !isRejected;

              return (
                <div key={user.id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{user.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                        {user.phone && <p className="text-[10px] text-slate-500 font-mono">{user.phone}</p>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                      isRejected ? 'bg-slate-100 text-slate-500 border-slate-200' :
                      user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      user.role === 'employee' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {isRejected ? 'UNASSIGNED' : user.role === 'employee' ? 'EMPLOYEE' : user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-500" /> Rejected
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                        </span>
                      )}
                    </div>
                    <div>
                      <span className={`w-2 h-2 inline-block rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'} mr-1`} />
                      <span className="text-slate-600 font-mono">{isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenAssignModal(user)}
                      className="flex-1 text-center py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] active:scale-95 transition-all shadow-sm"
                    >
                      {isPending ? 'Review & Assign' : isRejected ? 'Re-evaluate' : 'Edit Role'}
                    </button>
                    {isPending && (
                      <button
                        onClick={() => handleOpenRejectModal(user)}
                        className="flex-1 text-center py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] active:scale-95 transition-all shadow-sm"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenResetPasswordModal(user)}
                      className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 border border-slate-200 font-bold text-[10px] active:scale-95 transition-all shadow-sm shrink-0"
                      title="Reset Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Clean Responsive Table without Horizontal Scroll */}
        <div className="hidden md:block w-full overflow-hidden">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-50/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 pl-4 pr-2 font-bold">Employee</th>
                <th className="py-2.5 px-2 font-bold whitespace-nowrap">Assigned Role</th>
                <th className="py-2.5 px-2 font-bold whitespace-nowrap">Approval Status</th>
                <th className="py-2.5 px-2 font-bold whitespace-nowrap">Account State</th>
                <th className="py-2.5 px-2 font-bold whitespace-nowrap">Registered</th>
                <th className="py-2.5 pl-2 pr-4 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No employee accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isRejected = user.approval_status === 'rejected';
                  const isApproved = user.approval_status === 'approved';
                  const isPending =
                    !isApproved &&
                    !isRejected &&
                    (user.approval_status === 'pending_admin_review' || user.role === 'pending');
                  const isActive = user.is_active !== false && !isRejected;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 border-b border-slate-100/80 transition-colors group"
                    >
                      {/* Employee info */}
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-2xs overflow-hidden shrink-0 text-xs">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs truncate max-w-[150px] lg:max-w-[200px]">{user.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 truncate">
                              <span className="truncate max-w-[120px] lg:max-w-[160px]">{user.email}</span>
                              {user.phone && (
                                <span className="text-slate-300 hidden xl:inline">• {user.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {isRejected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold">
                            Unassigned
                          </span>
                        ) : user.role === 'admin' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            Admin
                          </span>
                        ) : user.role === 'employee' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            Employee
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold animate-pulse">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Approval Status - Mutually Exclusive (Only one badge) */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </td>

                      {/* Account State */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Signup Date */}
                      <td className="py-2.5 px-2 whitespace-nowrap text-slate-400 font-mono text-[10px]">
                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action buttons - Designed to never cut off */}
                      <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(user)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                              >
                                Review & Assign
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(user)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(user)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                              >
                                Edit Role
                              </button>
                              <button
                                onClick={() => handleToggleActive(user)}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                                  isActive
                                    ? 'bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                                title={isActive ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}

                          {isRejected && (
                            <button
                              onClick={() => handleOpenAssignModal(user)}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
                              title="Re-evaluate registration"
                            >
                              Re-evaluate
                            </button>
                          )}

                          {/* Password Reset Button */}
                          <button
                            onClick={() => handleOpenResetPasswordModal(user)}
                            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                            title="Issue Temporary Password & Reset Credentials"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment & Approval Modal */}
      {/* Role Assignment & Approval Modal */}
      {modalMode === 'assign' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#091A2F] text-base">Assign Role & Approve</h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee Name:</span>
                <span className="font-bold text-slate-900">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="text-blue-700 font-mono font-semibold">{selectedUser.email}</span>
              </div>
              {selectedUser.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-800 font-mono font-semibold">{selectedUser.phone}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block font-mono uppercase">
                Select Operational Role *
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'employee' as UserRole,
                    title: 'Employee',
                    desc: 'Manages leads, follow-ups, converted traders, P&L, and profit uploads.',
                  },
                  {
                    id: 'admin' as UserRole,
                    title: 'System Administrator',
                    desc: 'Full access to verification desk, expenses, reports, and staff management.',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setSelectedRole(item.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedRole === item.id
                        ? 'bg-blue-50 border-blue-500/80 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === item.id}
                      onChange={() => setSelectedRole(item.id)}
                      className="mt-1 accent-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{item.title}</div>
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5 font-medium">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmAssign}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Approve & Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {modalMode === 'reject' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-bold text-[#091A2F] text-base">Reject Registration</h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to reject the employee registration for{' '}
              <strong className="text-slate-800 font-bold">{selectedUser.name}</strong> ({selectedUser.email})?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block font-mono uppercase">
                Rejection Reason (Logged to Audit Trail) *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unverified credentials, non-authorized email domain"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Reset Modal */}
      {modalMode === 'reset_password' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Reset Employee Password</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Issue temporary access credentials</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Employee Target Summary */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-bold text-slate-900">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Login Email:</span>
                <span className="text-blue-700 font-mono font-semibold">{selectedUser.email}</span>
              </div>
            </div>

            {/* Temporary Password Configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 block uppercase font-mono tracking-wider">
                  Assigned Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomKey}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Randomize
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tempPasswordToAssign}
                  onChange={(e) => setTempPasswordToAssign(e.target.value)}
                  placeholder="e.g. T2T@Madhan2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-24 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleCopyTempPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  {copiedPassword ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Standard format: <code className="text-slate-600 font-mono font-bold">T2T@[Name]2026</code>. When the employee logs in with this temporary key, the CRM will pop up an interactive screen prompting them to set their permanent password.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !tempPasswordToAssign.trim()}
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none active:scale-98"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-white" />
                    Save & Force Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
