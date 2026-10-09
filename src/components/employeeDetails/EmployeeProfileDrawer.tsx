import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Users,
  Phone,
  Building2,
  Droplet,
  Calendar,
  Briefcase,
  History,
  ArrowRightLeft,
  Activity,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Lock,
  BadgeCheck,
  UserCheck,
  Sparkles,
  Mail,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { User as UserType, ActiveTrader, Lead } from '../../types';
import { ClientTransferModal } from './ClientTransferModal';
import { formatINR } from '../../lib/calculations';

interface EmployeeProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: UserType | null;
  onRefresh?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const EmployeeProfileDrawer: React.FC<EmployeeProfileDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  onRefresh,
}) => {
  const {
    currentUser,
    users,
    traders,
    leads,
    clientAssignments,
    auditLogs,
    updateUserProfile,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'personal' | 'current_clients' | 'previous_clients' | 'transfer_history' | 'activity'>('personal');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [personalPhone, setPersonalPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [managerId, setManagerId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transfer Modal State
  const [transferClientTarget, setTransferClientTarget] = useState<ActiveTrader | Lead | null>(null);
  const [transferClientType, setTransferClientType] = useState<'trader' | 'lead'>('trader');

  // Sync edit form with employee whenever opened
  useEffect(() => {
    if (employee && isOpen) {
      setPersonalPhone(employee.personal_phone || employee.phone || '');
      setOfficePhone(employee.office_phone || '');
      setBloodGroup(employee.blood_group || 'Unknown');
      setDesignation(employee.designation || 'Relationship Manager');
      setDepartment(employee.department || 'Client Operations & Advisory');
      setManagerId(employee.manager_id || '10000000-0000-0000-0000-000000000001');
      setEmployeeCode(
        employee.employee_code?.startsWith('T2T-')
          ? employee.employee_code
          : (employee.employee_code ? `T2T-${employee.employee_code.replace(/^T2T-?/i, '').toUpperCase()}` : `T2T-${employee.id.substring(0, 4).toUpperCase()}`)
      );
      setJoiningDate(employee.joining_date || (employee.created_at ? employee.created_at.split('T')[0] : '2026-01-01'));
      setIsEditing(false);
      setToastMsg(null);
    }
  }, [employee, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const isSelf = currentUser?.id === employee.id;
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  // Strict Field Permissions
  const canEditPersonalPhone = isSelf || isAdmin;
  const canEditBloodGroup = isSelf || isAdmin;
  const canEditOfficePhone = isAdmin || (isManager && (employee.manager_id === currentUser?.id || employee.role === 'employee'));
  const canEditAdminFields = isAdmin;

  // Copy handler
  const handleCopy = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Current Clients: active traders and leads currently assigned to this employee
  const currentAssignedTraders = traders.filter(
    (t) => (t.assigned_to === employee.id || t.employee_id === employee.id) && t.status === 'active'
  );
  const currentAssignedLeads = leads.filter(
    (l) => l.assigned_to === employee.id && l.status !== 'active_trader' && !l.is_archived
  );

  // 2. Previous Clients: assignments for this employee that are closed or transferred
  const previousAssignments = clientAssignments.filter(
    (a) => a.employee_id === employee.id && (a.status === 'transferred' || a.status === 'completed' || a.status === 'closed')
  );

  // 3. Client Transfer Timeline: assignments where this employee was either source or recipient
  const transferTimeline = clientAssignments.filter(
    (a) => a.employee_id === employee.id || a.transferred_to_employee_id === employee.id
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 4. Profile Activity Audit: logs for this user's record_id
  const userAuditLogs = auditLogs.filter(
    (l) => l.record_id === employee.id || (l.user_id === employee.id && l.table_name === 'users')
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMsg(null);

    try {
      const updates: any = {};
      if (canEditPersonalPhone) updates.personal_phone = personalPhone.trim();
      if (canEditOfficePhone) updates.office_phone = officePhone.trim();
      if (canEditBloodGroup) updates.blood_group = bloodGroup.trim();

      if (canEditAdminFields) {
        updates.designation = designation.trim();
        updates.department = department.trim();
        updates.employee_code = employeeCode.trim();
        updates.joining_date = joiningDate.trim();
        updates.manager_id = managerId;
      }

      const res = await updateUserProfile(employee.id, updates);
      if (res.success) {
        showToast(res.message, 'success');
        setIsEditing(false);
        onRefresh?.();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save changes.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const managerOptions = users.filter((u) => u.role === 'manager' || u.role === 'admin');

  const formattedEmployeeCode = employee.employee_code?.startsWith('T2T-')
    ? employee.employee_code
    : (employee.employee_code ? `T2T-${employee.employee_code.replace(/^T2T-?/i, '').toUpperCase()}` : `T2T-${employee.id.substring(0, 4).toUpperCase()}`);

  const totalAssignedClients = currentAssignedTraders.length + currentAssignedLeads.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Card Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner with Glowing Gradient */}
        <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 relative p-4 sm:p-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Time2Trade Staff Profile</span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (canEditPersonalPhone || canEditOfficePhone || canEditAdminFields) && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('personal');
                  setIsEditing(true);
                }}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer border border-white/20"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Staff Header Overlap Bar */}
        <div className="px-5 sm:px-7 pt-0 pb-3 relative shrink-0 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-start sm:items-end gap-4">
              {/* Overlapping Rounded Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 -mt-10 sm:-mt-12 rounded-2xl object-cover shadow-xl border-4 border-white bg-white shrink-0 overflow-hidden flex items-center justify-center relative">
                {employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-black text-3xl">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Badges */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    {employee.name}
                  </h3>
                  <BadgeCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {formattedEmployeeCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {employee.role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {employee.designation || 'Relationship Manager'} • {employee.department || 'Client Operations & Advisory'}
                  </span>
                  <span className="text-[10px] font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Staff
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Meta Stats / Reporting Info */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/80 self-start sm:self-end">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Reporting Line
                </span>
                <span className="font-bold text-slate-700">
                  {employee.manager_name || 'Karthik Muni'}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Active Clients
                </span>
                <span className="font-black text-blue-700 font-mono">
                  {totalAssignedClients}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Segmented Navigation Tabs Bar (No Text Truncation!) */}
        <div className="px-5 sm:px-7 py-2.5 bg-slate-50/80 border-b border-slate-200/80 shrink-0">
          <div className="bg-slate-200/60 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'personal'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal & Work Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('current_clients')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'current_clients'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Active Clients</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'current_clients' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/70 text-slate-700'
              }`}>
                {totalAssignedClients}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('previous_clients')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'previous_clients'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Previous Clients</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'previous_clients' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/70 text-slate-700'
              }`}>
                {previousAssignments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transfer_history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'transfer_history'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Audit</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'transfer_history' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/70 text-slate-700'
              }`}>
                {transferTimeline.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'activity'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Profile Activity</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div
            className={`mx-6 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 animate-in slide-in-from-top-2 shrink-0 ${
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
            <span className="font-semibold">{toastMsg.text}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* TAB 1: PERSONAL & WORK DETAILS */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Staff Coordinates & Hierarchy Credentials</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contact details, official SIM assignments, medical profile, and management alignment
                  </p>
                </div>

                {!isEditing ? (
                  (canEditPersonalPhone || canEditOfficePhone || canEditAdminFields) && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Form / Cards */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Contact Coordinates */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" /> Contact Numbers
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {canEditOfficePhone ? 'Admin / Manager editable' : 'Protected'}
                      </span>
                    </div>

                    {/* Personal Phone */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Personal Phone
                        </label>
                        {!isEditing && employee.personal_phone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.personal_phone!, 'personal')}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Copy personal number"
                          >
                            {copiedField === 'personal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      {isEditing && canEditPersonalPhone ? (
                        <input
                          type="text"
                          value={personalPhone}
                          onChange={(e) => setPersonalPhone(e.target.value)}
                          placeholder="e.g. 9894685438"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                        />
                      ) : (
                        <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          {employee.personal_phone || employee.phone || <span className="text-slate-400 font-normal italic">Not Provided</span>}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {canEditPersonalPhone ? 'Editable by employee self-service' : 'Employee personal contact'}
                      </span>
                    </div>

                    {/* Office Phone */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600" /> Assigned Office SIM
                        </label>
                        {!isEditing && employee.office_phone && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.office_phone!, 'office')}
                            className="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Copy office number"
                          >
                            {copiedField === 'office' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      {isEditing && canEditOfficePhone ? (
                        <input
                          type="text"
                          value={officePhone}
                          onChange={(e) => setOfficePhone(e.target.value)}
                          placeholder="e.g. 8463980327"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono bg-blue-50/20"
                        />
                      ) : (
                        <div className="font-mono text-xs font-bold text-blue-700 bg-blue-50/40 px-3 py-2 rounded-xl border border-blue-200/80 flex items-center justify-between select-all">
                          <span className="tracking-wide">{employee.office_phone || <span className="text-amber-700 font-normal italic font-sans text-xs">No Office SIM Assigned</span>}</span>
                          {employee.office_phone && (
                            <button
                              type="button"
                              onClick={() => handleCopy(employee.office_phone!, 'office')}
                              className="p-1 text-blue-500 hover:text-blue-700 rounded-md hover:bg-blue-100/50 transition-colors"
                              title="Copy SIM number"
                            >
                              {copiedField === 'office' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{canEditOfficePhone ? 'Authorized to reassign SIM' : 'Managed by Admin / Manager (Read-only for staff)'}</span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> Official Email
                      </label>
                      <div className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span>{employee.email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(employee.email, 'email')}
                          className="text-slate-400 hover:text-blue-600 p-0.5"
                          title="Copy email"
                        >
                          {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Blood Group */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-rose-500" /> Blood Group
                      </label>
                      {isEditing && canEditBloodGroup ? (
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                        >
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg === 'Unknown' ? 'Unknown / Not Provided' : bg}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                          {employee.blood_group && employee.blood_group !== 'Unknown' ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                              {employee.blood_group}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Unknown / Not Provided</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal">(Emergency medical record)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Organization & Reporting Structure */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Organizational Hierarchy
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        Time2Trade CRM
                      </span>
                    </div>

                    {/* Reporting Manager */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Reporting Manager
                      </label>
                      {isEditing && canEditAdminFields ? (
                        <select
                          value={managerId}
                          onChange={(e) => setManagerId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                        >
                          {managerOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-800">{employee.manager_name || 'Karthik Muni'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                            MANAGER
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400">Direct operational supervisory line</span>
                    </div>

                    {/* Designation */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Designation
                      </label>
                      {isEditing && canEditAdminFields ? (
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          {employee.designation || 'Relationship Manager'}
                        </div>
                      )}
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Department
                      </label>
                      {isEditing && canEditAdminFields ? (
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          {employee.department || 'Client Operations & Advisory'}
                        </div>
                      )}
                    </div>

                    {/* Employee Code & Joining Date Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Employee Code
                        </label>
                        <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          {formattedEmployeeCode}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Joining Date
                        </label>
                        <div className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          {employee.joining_date || employee.created_at?.split('T')[0] || '2026-01-01'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ACTIVE CLIENTS */}
          {activeTab === 'current_clients' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Actively Managed Portfolio</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live client assignments currently handled by {employee.name}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    {currentAssignedTraders.length} Active Trader(s)
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-bold border border-blue-200">
                    {currentAssignedLeads.length} Open Lead(s)
                  </span>
                </div>
              </div>

              {currentAssignedTraders.length === 0 && currentAssignedLeads.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Active Clients Assigned</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    This staff member currently has zero active client assignments. Assign leads or active traders from the central registry.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active Traders Section */}
                  {currentAssignedTraders.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Active Traders ({currentAssignedTraders.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentAssignedTraders.map((trader) => (
                          <div
                            key={trader.id}
                            className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{trader.name}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-mono">
                                  Trader
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-slate-600 font-mono">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-sans">Phone:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span>{trader.phone}</span>
                                    <a
                                      href={`tel:${trader.phone}`}
                                      className="text-[10px] font-sans font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                      Call
                                    </a>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-sans">Joined:</span>
                                  <span>{trader.joined_at || 'Recent'}</span>
                                </div>
                                {trader.total_profit_shared > 0 && (
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-sans">Profit Shared:</span>
                                    <span className="text-emerald-700 font-bold font-sans">
                                      {formatINR(trader.total_profit_shared)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(isAdmin || isManager) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferClientTarget(trader);
                                  setTransferClientType('trader');
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                                <span>Transfer Trader Assignment</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open Leads Section */}
                  {currentAssignedLeads.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        Assigned Open Leads ({currentAssignedLeads.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentAssignedLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase font-mono">
                                  Lead ({lead.status})
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-slate-600 font-mono">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-sans">Phone:</span>
                                  <span>{lead.phone}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-sans">Source:</span>
                                  <span className="font-sans">{lead.source}</span>
                                </div>
                              </div>
                            </div>

                            {(isAdmin || isManager) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferClientTarget(lead);
                                  setTransferClientType('lead');
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                                <span>Transfer Lead</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREVIOUS CLIENTS */}
          {activeTab === 'previous_clients' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Historical Client Handover Records</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Retained historical record of clients previously handled before handover or reassignment
                </p>
              </div>

              {previousAssignments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <History className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Previous Client Records</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    No transferred or historical client handovers recorded for this staff member yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previousAssignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{asg.client_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{asg.client_phone}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono capitalize">
                          {asg.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100 font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Tenure Handled:</span>
                          {asg.start_date.split('T')[0]} → {asg.end_date ? asg.end_date.split('T')[0] : 'Handed Over'}
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Handed Over To:</span>
                          <span className="text-blue-700 font-bold font-sans">
                            {asg.transferred_to_employee_name || 'Another Staff Member'}
                          </span>
                        </div>
                      </div>

                      {asg.transfer_reason && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-700">Handover Reason:</span> {asg.transfer_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLIENT TRANSFER HISTORY AUDIT */}
          {activeTab === 'transfer_history' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  <span>Transfer & Handover Timeline</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete chronological movements of clients transferred to or from this staff member
                </p>
              </div>

              {transferTimeline.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Transfer Timeline Available</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    Client transfer movements will be automatically audited here whenever a client is reassigned.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {transferTimeline.map((item) => {
                    const isIncoming = item.employee_id === employee.id && item.status === 'active';
                    return (
                      <div key={item.id} className="relative space-y-1.5 text-xs">
                        <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white ring-2 ${
                          isIncoming ? 'bg-emerald-500 ring-emerald-200' : 'bg-blue-600 ring-blue-200'
                        }`} />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            {isIncoming ? (
                              <span className="text-emerald-700">Received Client Assignment</span>
                            ) : (
                              <span className="text-blue-700">Transferred Client Out</span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 text-xs space-y-1">
                          <div>
                            <span className="font-bold text-slate-700">Client:</span> {item.client_name} ({item.client_phone})
                          </div>
                          {item.assigned_by_name && (
                            <div>
                              <span className="font-bold text-slate-700">Authorized By:</span> {item.assigned_by_name}
                            </div>
                          )}
                          {item.transfer_reason && (
                            <div>
                              <span className="font-bold text-slate-700">Reason:</span> {item.transfer_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFILE ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Profile Security & Audit Ledger</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable security audit log of contact modifications, office SIM reassignments, and manager alignment
                </p>
              </div>

              {userAuditLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No Profile Edits Logged</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    All administrative updates to phone numbers, manager alignment, or profile details will be recorded here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userAuditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Modified by: <span className="font-semibold text-slate-700">{log.user_name || 'System Admin'}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Client Transfer Modal */}
      {transferClientTarget && (
        <ClientTransferModal
          isOpen={Boolean(transferClientTarget)}
          onClose={() => setTransferClientTarget(null)}
          client={transferClientTarget}
          clientType={transferClientType}
          currentEmployee={employee}
          onSuccess={() => {
            showToast('Client transferred successfully.', 'success');
            onRefresh?.();
          }}
        />
      )}
    </div>,
    document.body
  );
};
