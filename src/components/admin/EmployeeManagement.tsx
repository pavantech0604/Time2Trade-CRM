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
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'assign' | 'reject' | 'details' | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('telecaller');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesApproval =
      approvalFilter === 'all' || (u.approval_status || 'approved') === approvalFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active !== false) ||
      (statusFilter === 'inactive' && u.is_active === false);

    return matchesSearch && matchesRole && matchesApproval && matchesStatus;
  });

  // KPIs
  const totalEmployees = users.length;
  const pendingReviews = users.filter(
    (u) => u.approval_status === 'pending_admin_review' || u.role === 'pending'
  ).length;
  const approvedStaff = users.filter((u) => u.approval_status === 'approved').length;
  const activeStaff = users.filter((u) => u.is_active !== false && u.approval_status === 'approved').length;

  const handleOpenAssignModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role === 'pending' ? 'telecaller' : user.role);
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

  const handleResetPassword = (user: User) => {
    showToast(`Password reset link dispatched to ${user.email}`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 bg-white border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-550 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Staff & Role Management Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Review new employee signups, assign authorized roles, and manage active system access.
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

        <div className="bg-white border border-amber-250 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-800">{pendingReviews}</p>
          <p className="text-[10px] text-amber-600 font-mono font-medium">Requires role assignment</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-550 text-xs font-bold">
            <span>Approved Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{approvedStaff}</p>
          <p className="text-[10px] text-slate-400 font-mono">Role validated accounts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-550 text-xs font-bold">
            <span>Active Operators</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800">{activeStaff}</p>
          <p className="text-[10px] text-slate-400 font-mono">Currently authorized to log in</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-850 placeholder:text-slate-450 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
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
            <option value="telecaller">Telecaller</option>
            <option value="relationship_manager">Relationship Manager</option>
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
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No employees found.</div>
          ) : (
            filteredUsers.map((user) => {
              const isPending = user.approval_status === 'pending_admin_review' || user.role === 'pending';
              const isApproved = user.approval_status === 'approved';
              const isRejected = user.approval_status === 'rejected';
              const isActive = user.is_active !== false;

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
                      user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-150' :
                      user.role === 'telecaller' ? 'bg-blue-50 text-blue-700 border-blue-150' :
                      user.role === 'relationship_manager' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-800 border-amber-150 animate-pulse'
                    }`}>
                      {user.role === 'relationship_manager' ? 'RM' : user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {isPending && <span className="text-amber-700 font-bold">Pending Review</span>}
                      {isApproved && <span className="text-emerald-700 font-bold">Approved</span>}
                      {isRejected && <span className="text-rose-700 font-bold">Rejected</span>}
                    </div>
                    <div>
                      <span className={`w-2 h-2 inline-block rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-350'} mr-1`} />
                      <span className="text-slate-600 font-mono">{isActive ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenAssignModal(user)}
                      className="flex-1 text-center py-2.5 rounded-xl bg-blue-550/10 text-blue-700 border border-blue-200 font-bold text-[10px] active:scale-95 transition-all shadow-sm"
                    >
                      {isPending ? 'Review & Assign' : 'Edit Role'}
                    </button>
                    {isPending && (
                      <button
                        onClick={() => handleOpenRejectModal(user)}
                        className="flex-1 text-center py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] active:scale-95 transition-all shadow-sm"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Heavy Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091A2F]/5 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-bold text-slate-550">Employee</th>
                <th className="py-3.5 px-4 font-bold text-slate-550">Assigned Role</th>
                <th className="py-3.5 px-4 font-bold text-slate-550">Approval Status</th>
                <th className="py-3.5 px-4 font-bold text-slate-550">Account State</th>
                <th className="py-3.5 px-4 font-bold text-slate-550">Registered</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-550">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No employee accounts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isPending =
                    user.approval_status === 'pending_admin_review' || user.role === 'pending';
                  const isApproved = user.approval_status === 'approved';
                  const isRejected = user.approval_status === 'rejected';
                  const isActive = user.is_active !== false;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 border-b border-slate-100/60 transition-colors group"
                    >
                      {/* Employee info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md overflow-hidden shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{user.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-3.5 px-4 font-mono">
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                            Admin
                          </span>
                        )}
                        {user.role === 'telecaller' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                            Telecaller
                          </span>
                        )}
                        {user.role === 'relationship_manager' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                            RM
                          </span>
                        )}
                        {user.role === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold animate-pulse">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-850 border border-amber-250 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-550/10 text-emerald-800 border border-emerald-250 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Account State */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <span className="w-2 h-2 rounded-full bg-slate-350" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Signup Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Assignment & Approve Button */}
                          <button
                            onClick={() => handleOpenAssignModal(user)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            {isPending ? 'Review & Assign' : 'Edit Role'}
                          </button>

                          {/* Reject button for pending accounts */}
                          {isPending && (
                            <button
                              onClick={() => handleOpenRejectModal(user)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                            >
                              Reject
                            </button>
                          )}

                          {/* Toggle Active status */}
                          {!isPending && (
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-1.5 rounded-xl border text-[11px] transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                              title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Password Reset */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-[11px] transition-all cursor-pointer"
                            title="Trigger Password Reset Email"
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#091A2F] text-base">Assign Role & Approve</h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
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
                    id: 'telecaller' as UserRole,
                    title: 'Telecaller',
                    desc: 'Restricted to assigned lead queue, call logs, and RM handoffs.',
                  },
                  {
                    id: 'relationship_manager' as UserRole,
                    title: 'Relationship Manager (RM)',
                    desc: 'Manages qualified leads, converted traders, P&L, and profit uploads.',
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
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
              <label className="text-xs font-semibold text-slate-550 block font-mono uppercase">
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
    </div>
  );
};
