import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Building2,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Lock,
  Edit3,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Eye,
  SlidersHorizontal,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User, ActiveTrader } from '../../types';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import { ClientTransferModal } from './ClientTransferModal';

interface EmployeeDirectoryProps {
  roleMode?: 'admin' | 'manager';
}

type SortField = 'name' | 'employee_code' | 'designation' | 'manager' | 'current_clients' | 'status';
type SortOrder = 'asc' | 'desc';

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ roleMode = 'admin' }) => {
  const {
    users,
    currentUser,
    traders,
    leads,
    clientAssignments,
    updateUserProfile,
  } = useAuth();

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'manager' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals & Drawers
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [quickOfficeEditId, setQuickOfficeEditId] = useState<string | null>(null);
  const [quickOfficeNumber, setQuickOfficeNumber] = useState<string>('');
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Column Visibility Preferences
  const [colVisibility, setColVisibility] = useState({
    id: true,
    designation: true,
    manager: true,
    personal_phone: true,
    office_phone: true,
    current_clients: true,
    previous_clients: true,
    status: true,
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Base employee list based on role hierarchy with strict deduplication
  const baseEmployees = useMemo(() => {
    // 1. Exclude rejected applicant accounts
    let list = users.filter((u) => u.approval_status !== 'rejected');

    if (roleFilter === 'admin') {
      list = list.filter((u) => u.role === 'admin');
    } else if (roleFilter === 'manager') {
      list = list.filter((u) => u.role === 'manager');
    } else if (roleFilter === 'employee') {
      list = list.filter((u) => u.role === 'employee');
    } else {
      // In the employee directory, display employees and managers by default
      list = list.filter((u) => u.role === 'employee' || u.role === 'manager');
    }

    if (isManager && !isAdmin && roleFilter !== 'admin') {
      // Manager sees team members reporting to them or self
      list = list.filter(
        (u) =>
          u.manager_id === currentUser.id ||
          u.id === currentUser.id ||
          u.role === 'employee'
      );
    }

    // 2. Strict deduplication by normalized phone, email, and identity with canonical sorting
    const sorted = [...list].sort((a, b) => {
      if (a.id === '99b02b72-2886-4257-acc5-6ce655f8e4dc') return -1;
      if (b.id === '99b02b72-2886-4257-acc5-6ce655f8e4dc') return 1;
      const aTime = a.email?.includes('@time2trade.com') ? 1 : 0;
      const bTime = b.email?.includes('@time2trade.com') ? 1 : 0;
      if (aTime !== bTime) return bTime - aTime;
      const aAct = a.is_active !== false && a.approval_status !== 'rejected' ? 1 : 0;
      const bAct = b.is_active !== false && b.approval_status !== 'rejected' ? 1 : 0;
      return bAct - aAct;
    });

    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const deduped: User[] = [];

    for (const u of sorted) {
      if (seenIds.has(u.id)) continue;
      // Ignore known old duplicate IDs
      if (
        u.id === '02abbc1d-7af8-45b1-a6dc-46c928b9f194' ||
        u.id === 'a5f41104-bc78-49ba-946d-007075ead6a9' ||
        u.id === '7f90e43c-4148-4b8b-ae34-7547b158a5a6' ||
        u.id === '60efb575-c991-4a4a-b82c-f96e599b880f' ||
        u.id === '89d8ec24-13c5-4169-be6e-b2648d3e29bf'
      ) {
        continue;
      }

      const phoneDigits = (u.phone || u.personal_phone || '').replace(/\D/g, '');
      const emailLower = (u.email || '').toLowerCase().trim();
      const cleanName = (u.name || '').toLowerCase().replace(/[^a-z]/g, '');

      if (phoneDigits && phoneDigits.length >= 10 && seenPhones.has(phoneDigits)) {
        continue;
      }
      if (emailLower && seenEmails.has(emailLower)) {
        continue;
      }
      // Deduplicate known duplicate employee names
      if (cleanName && (cleanName.includes('bhavani') || cleanName.includes('lokesh') || cleanName.includes('madhan'))) {
        const alreadyHas = deduped.some((existing) => {
          const exName = (existing.name || '').toLowerCase().replace(/[^a-z]/g, '');
          if (cleanName.includes('bhavani') && exName.includes('bhavani')) return true;
          if (cleanName.includes('lokesh') && exName.includes('lokesh')) return true;
          if (cleanName.includes('madhan') && exName.includes('madhan')) return true;
          return false;
        });
        if (alreadyHas) continue;
      }

      if (phoneDigits && phoneDigits.length >= 10) seenPhones.add(phoneDigits);
      if (emailLower) seenEmails.add(emailLower);
      seenIds.add(u.id);
      deduped.push(u);
    }

    return deduped;
  }, [users, currentUser, isManager, isAdmin, roleFilter]);

  // Client counts mapping
  const clientCountsMap = useMemo(() => {
    const activeCounts: Record<string, number> = {};
    const prevCounts: Record<string, number> = {};

    traders.forEach((t) => {
      let empId = t.assigned_to || t.employee_id;
      if (empId === '02abbc1d-7af8-45b1-a6dc-46c928b9f194') {
        empId = '99b02b72-2886-4257-acc5-6ce655f8e4dc';
      }
      if (empId && t.status === 'active') {
        activeCounts[empId] = (activeCounts[empId] || 0) + 1;
      }
    });

    leads.forEach((l) => {
      let empId = l.assigned_to;
      if (empId === '02abbc1d-7af8-45b1-a6dc-46c928b9f194') {
        empId = '99b02b72-2886-4257-acc5-6ce655f8e4dc';
      }
      if (empId && l.status !== 'active_trader' && !l.is_archived) {
        activeCounts[empId] = (activeCounts[empId] || 0) + 1;
      }
    });

    clientAssignments.forEach((a) => {
      if (a.employee_id && (a.status === 'transferred' || a.status === 'completed' || a.status === 'closed')) {
        prevCounts[a.employee_id] = (prevCounts[a.employee_id] || 0) + 1;
      }
    });

    return { activeCounts, prevCounts };
  }, [traders, leads, clientAssignments]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return baseEmployees
      .filter((emp) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          emp.name.toLowerCase().includes(q) ||
          (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
          (emp.email && emp.email.toLowerCase().includes(q)) ||
          (emp.office_phone && emp.office_phone.includes(q)) ||
          (emp.personal_phone && emp.personal_phone.includes(q)) ||
          (emp.phone && emp.phone.includes(q));

        const matchesManager =
          managerFilter === 'all' ||
          emp.manager_id === managerFilter ||
          (emp.manager_name && emp.manager_name.toLowerCase().includes(managerFilter.toLowerCase()));

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && emp.is_active !== false && emp.approval_status !== 'rejected') ||
          (statusFilter === 'inactive' && (emp.is_active === false || emp.approval_status === 'rejected'));

        const empActiveCount = clientCountsMap.activeCounts[emp.id] || 0;
        const matchesClient =
          clientFilter === 'all' ||
          (clientFilter === 'handling' && empActiveCount > 0) ||
          (clientFilter === 'unassigned' && empActiveCount === 0);

        return matchesQuery && matchesManager && matchesStatus && matchesClient;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === 'employee_code') {
          cmp = (a.employee_code || '').localeCompare(b.employee_code || '');
        } else if (sortField === 'designation') {
          cmp = (a.designation || '').localeCompare(b.designation || '');
        } else if (sortField === 'manager') {
          cmp = (a.manager_name || '').localeCompare(b.manager_name || '');
        } else if (sortField === 'current_clients') {
          const aCount = clientCountsMap.activeCounts[a.id] || 0;
          const bCount = clientCountsMap.activeCounts[b.id] || 0;
          cmp = aCount - bCount;
        } else if (sortField === 'status') {
          const aStatus = a.is_active !== false ? 1 : 0;
          const bStatus = b.is_active !== false ? 1 : 0;
          cmp = aStatus - bStatus;
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [baseEmployees, searchQuery, managerFilter, statusFilter, clientFilter, sortField, sortOrder, clientCountsMap]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  // Summary Metrics (Phase 5)
  const totalEmployeesCount = baseEmployees.length;
  const activeEmployeesCount = baseEmployees.filter((e) => e.is_active !== false && e.approval_status !== 'rejected').length;
  const withOfficePhoneCount = baseEmployees.filter((e) => Boolean(e.office_phone)).length;
  const withoutOfficePhoneCount = totalEmployeesCount - withOfficePhoneCount;
  const handlingClientsCount = baseEmployees.filter((e) => (clientCountsMap.activeCounts[e.id] || 0) > 0).length;
  const unassignedClientsCount = totalEmployeesCount - handlingClientsCount;

  // Sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Quick Office Phone update
  const handleSaveQuickOffice = async (userId: string) => {
    setQuickEditSaving(true);
    try {
      const res = await updateUserProfile(userId, {
        office_phone: quickOfficeNumber.trim(),
      });
      if (res.success) {
        showToast(`Office number saved for staff member.`, 'success');
        setQuickOfficeEditId(null);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update office number.', 'error');
    } finally {
      setQuickEditSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-3 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Employee Details
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
              {filteredEmployees.length} Staff Members
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">
            Manage employee profiles, contact information and client assignments.
          </p>
        </div>
      </div>

      {/* Phase 5 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Employees */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Total Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">{totalEmployeesCount}</div>
          <div className="text-[10px] text-slate-400 font-medium">Roster head count</div>
        </div>

        {/* Active Employees */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Active</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700">{activeEmployeesCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium">Ready for advisory</div>
        </div>

        {/* With Office Numbers */}
        <div className="bg-white rounded-2xl border border-blue-200 bg-blue-50/20 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">With Office SIM</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-black text-blue-900">{withOfficePhoneCount}</div>
          <div className="text-[10px] text-blue-700 font-medium">Assigned calling lines</div>
        </div>

        {/* Without Office Numbers */}
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">No Office SIM</span>
            <Phone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-black text-amber-800">{withoutOfficePhoneCount}</div>
          <div className="text-[10px] text-amber-700 font-medium">Pending line allocation</div>
        </div>

        {/* Handling Clients */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Handling Clients</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-xl font-black text-indigo-700">{handlingClientsCount}</div>
          <div className="text-[10px] text-slate-400 font-medium">Active client portfolios</div>
        </div>

        {/* Unassigned Employees */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Unassigned</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-xl font-black text-slate-700">{unassignedClientsCount}</div>
          <div className="text-[10px] text-slate-400 font-medium">Zero current clients</div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Instant Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, ID, office phone, personal phone..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Manager Filter */}
          <select
            value={managerFilter}
            onChange={(e) => {
              setManagerFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Managers</option>
            <option value="Karthik Muni">Karthik Muni (Branch Manager)</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">Active Staff (Employees & Managers)</option>
            <option value="employee">Employees Only</option>
            <option value="manager">Branch Managers Only</option>
            {isAdmin && <option value="admin">System Administrators</option>}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Client Portfolio Filter */}
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Client Portfolios</option>
            <option value="handling">Handling Clients (&gt;0)</option>
            <option value="unassigned">Unassigned (0 Clients)</option>
          </select>

          {/* Column Visibility Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsColMenuOpen(!isColMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Toggle Columns"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {isColMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-30 text-xs space-y-2">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-100">
                  Visible Columns
                </div>
                {Object.keys(colVisibility).map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 capitalize">
                    <input
                      type="checkbox"
                      checked={(colVisibility as any)[key]}
                      onChange={(e) =>
                        setColVisibility((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{key.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Directory Table - 100% Viewport Contained, Zero Horizontal Scroll */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Desktop Table View (hidden on mobile, visible on md and up) */}
        <div className="hidden md:block w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="bg-slate-50/95 border-b border-slate-200/90 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {colVisibility.id && (
                  <th
                    onClick={() => handleSort('employee_code')}
                    className="py-2.5 px-2.5 cursor-pointer hover:text-slate-800 font-mono w-[8.5%]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Emp ID</span>
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                    </div>
                  </th>
                )}
                <th
                  onClick={() => handleSort('name')}
                  className="py-2.5 px-2.5 cursor-pointer hover:text-slate-800 w-[18%]"
                >
                  <div className="flex items-center gap-1">
                    <span>Staff Member</span>
                    <ArrowUpDown className="w-3 h-3 shrink-0" />
                  </div>
                </th>
                {colVisibility.designation && (
                  <th
                    onClick={() => handleSort('designation')}
                    className="py-2.5 px-2.5 cursor-pointer hover:text-slate-800 w-[13%]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Designation</span>
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                    </div>
                  </th>
                )}
                {colVisibility.manager && (
                  <th
                    onClick={() => handleSort('manager')}
                    className="py-2.5 px-2.5 cursor-pointer hover:text-slate-800 w-[11%]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Manager</span>
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                    </div>
                  </th>
                )}
                {colVisibility.personal_phone && (
                  <th className="py-2.5 px-2.5 w-[11.5%]">Personal Phone</th>
                )}
                {colVisibility.office_phone && (
                  <th className="py-2.5 px-2.5 w-[14%]">Office SIM</th>
                )}
                {colVisibility.current_clients && (
                  <th
                    onClick={() => handleSort('current_clients')}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-800 w-[6%]"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span>Active</span>
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                    </div>
                  </th>
                )}
                {colVisibility.previous_clients && (
                  <th className="py-2.5 px-2 text-center w-[5.5%]">Past</th>
                )}
                {colVisibility.status && (
                  <th
                    onClick={() => handleSort('status')}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-slate-800 w-[6%]"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                    </div>
                  </th>
                )}
                <th className="py-2.5 px-2.5 text-right w-[6.5%]">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-xs text-slate-600">No employees match current filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or status filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const activeClientCount = clientCountsMap.activeCounts[emp.id] || 0;
                  const prevClientCount = clientCountsMap.prevCounts[emp.id] || 0;
                  const isQuickEditing = quickOfficeEditId === emp.id;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Employee ID */}
                      {colVisibility.id && (
                        <td className="py-2.5 px-2.5">
                          <span className="font-mono font-bold text-slate-700 text-[11px] bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/70 truncate inline-block max-w-full">
                            {emp.employee_code?.startsWith('T2T-')
                              ? emp.employee_code
                              : (emp.employee_code ? `T2T-${emp.employee_code.replace(/^T2T-?/i, '').toUpperCase()}` : `T2T-${emp.id.substring(0, 4).toUpperCase()}`)}
                          </span>
                        </td>
                      )}

                      {/* Staff Member Avatar & Name */}
                      <td className="py-2.5 px-2.5 min-w-0">
                        <div
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsProfileDrawerOpen(true);
                          }}
                          className="flex items-center gap-2 cursor-pointer group-hover:text-blue-600 transition-colors min-w-0"
                        >
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                            {emp.avatar_url ? (
                              <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                              emp.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 leading-tight text-xs truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      {colVisibility.designation && (
                        <td className="py-2.5 px-2.5 text-slate-700 font-medium text-xs truncate">
                          <span className="truncate block" title={emp.designation || 'Relationship Manager'}>
                            {emp.designation || 'Relationship Manager'}
                          </span>
                        </td>
                      )}

                      {/* Manager */}
                      {colVisibility.manager && (
                        <td className="py-2.5 px-2.5 text-slate-700 font-medium text-xs truncate">
                          <span className="truncate block" title={emp.manager_name || 'Karthik Muni'}>
                            {emp.manager_name || 'Karthik Muni'}
                          </span>
                        </td>
                      )}

                      {/* Personal Phone */}
                      {colVisibility.personal_phone && (
                        <td className="py-2.5 px-2.5 min-w-0">
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 truncate">
                            <span className="truncate">{emp.personal_phone || emp.phone || <span className="text-slate-400 italic font-sans text-[10px]">Not set</span>}</span>
                            {(emp.personal_phone || emp.phone) && (
                              <button
                                type="button"
                                onClick={() => handleCopy(emp.personal_phone || emp.phone!, `p-${emp.id}`)}
                                className="text-slate-300 hover:text-slate-600 p-0.5 shrink-0"
                                title="Copy personal number"
                              >
                                {copiedKey === `p-${emp.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Office Phone with Quick Edit - FULL NUMBER DISPLAY, NO CALL BUTTON */}
                      {colVisibility.office_phone && (
                        <td className="py-2.5 px-2.5 min-w-0">
                          {isQuickEditing ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <input
                                type="text"
                                value={quickOfficeNumber}
                                onChange={(e) => setQuickOfficeNumber(e.target.value)}
                                placeholder="8463980327"
                                className="w-24 px-1.5 py-0.5 text-[11px] font-mono rounded border border-blue-400 focus:outline-hidden bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveQuickOffice(emp.id)}
                                disabled={quickEditSaving}
                                className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 cursor-pointer"
                              >
                                {quickEditSaving ? '..' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickOfficeEditId(null)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              {emp.office_phone ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px] min-w-0">
                                  <span className="font-bold text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200/80 tracking-wide select-all">
                                    {emp.office_phone}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(emp.office_phone!, `o-${emp.id}`)}
                                    className="text-slate-300 hover:text-blue-600 p-0.5 shrink-0"
                                    title="Copy office number"
                                  >
                                    {copiedKey === `o-${emp.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                              )}

                              {(isAdmin || isManager) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickOfficeEditId(emp.id);
                                    setQuickOfficeNumber(emp.office_phone || '');
                                  }}
                                  className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 shrink-0"
                                  title="Edit office number"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Current Clients Count */}
                      {colVisibility.current_clients && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsProfileDrawerOpen(true);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono transition-transform hover:scale-105 cursor-pointer ${
                              activeClientCount > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {activeClientCount}
                          </button>
                        </td>
                      )}

                      {/* Previous Clients Count */}
                      {colVisibility.previous_clients && (
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                            prevClientCount > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-transparent text-slate-300'
                          }`}>
                            {prevClientCount}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {colVisibility.status && (
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            emp.is_active !== false && emp.approval_status !== 'rejected'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {emp.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}

                      {/* Action buttons */}
                      <td className="py-2.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsProfileDrawerOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-[11px] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Responsive Staff Cards (Optimized for all mobile screen sizes) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedEmployees.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-xs text-slate-600">No employees match current filters</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            paginatedEmployees.map((emp) => {
              const activeClientCount = clientCountsMap.activeCounts[emp.id] || 0;
              const prevClientCount = clientCountsMap.prevCounts[emp.id] || 0;

              return (
                <div
                  key={emp.id}
                  className="p-3.5 space-y-3 bg-white hover:bg-blue-50/20 transition-colors"
                >
                  {/* Top Row: Avatar + Name + ID + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setIsProfileDrawerOpen(true);
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden shadow-2xs">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          emp.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-sm truncate">
                            {emp.name}
                          </span>
                          <span className="font-mono font-bold text-slate-600 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {emp.employee_code?.startsWith('T2T-')
                              ? emp.employee_code
                              : (emp.employee_code ? `T2T-${emp.employee_code.replace(/^T2T-?/i, '').toUpperCase()}` : `T2T-${emp.id.substring(0, 4).toUpperCase()}`)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {emp.designation || 'Relationship Manager'} • {emp.manager_name || 'Karthik Muni'}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ${
                      emp.is_active !== false && emp.approval_status !== 'rejected'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {emp.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Contact Grid: Full Numbers Visible, No Call Button */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Office SIM Number - Full Number */}
                    <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-1">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block font-mono">
                        Office SIM
                      </span>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-blue-800 select-all truncate">
                          {emp.office_phone || <span className="text-slate-400 font-normal italic text-[11px]">Unassigned</span>}
                        </span>
                        {emp.office_phone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(emp.office_phone!, `mo-${emp.id}`)}
                            className="text-slate-400 hover:text-blue-600 p-1 shrink-0"
                            title="Copy office number"
                          >
                            {copiedKey === `mo-${emp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Personal Phone Number - Full Number */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                        Personal Phone
                      </span>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-800 select-all truncate">
                          {emp.personal_phone || emp.phone || <span className="text-slate-400 font-normal italic text-[11px]">Not set</span>}
                        </span>
                        {(emp.personal_phone || emp.phone) && (
                          <button
                            type="button"
                            onClick={() => handleCopy(emp.personal_phone || emp.phone!, `mp-${emp.id}`)}
                            className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
                            title="Copy personal number"
                          >
                            {copiedKey === `mp-${emp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: Client Counts & Profile Action */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold">
                        {activeClientCount} Active Clients
                      </span>
                      {prevClientCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono">
                          {prevClientCount} Past
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setIsProfileDrawerOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop-First Pagination */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{paginatedEmployees.length}</strong> of{' '}
            <strong className="text-slate-800">{filteredEmployees.length}</strong> employees
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-slate-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Employee Profile Side Drawer */}
      {selectedEmployee && (
        <EmployeeProfileDrawer
          isOpen={isProfileDrawerOpen}
          onClose={() => {
            setIsProfileDrawerOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
};
