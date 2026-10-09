import React, { useState } from 'react';
import {
  User,
  Phone,
  Building2,
  Droplet,
  UserCheck,
  Calendar,
  Lock,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  History,
  Shield,
  Copy,
  Check,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadFileToBucket, supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/calculations';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const EmployeeSelfProfile: React.FC = () => {
  const {
    currentUser,
    traders,
    leads,
    clientAssignments,
    updateUserProfile,
    updateUserAvatar,
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [personalPhone, setPersonalPhone] = useState(
    currentUser?.personal_phone || currentUser?.phone || ''
  );
  const [bloodGroup, setBloodGroup] = useState(currentUser?.blood_group || 'Unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!currentUser) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadFileToBucket('avatars', file, `user_${currentUser.id}`);
      if (res.error) {
        showToast('Avatar upload failed. Please try a smaller image.', 'error');
        setIsUploading(false);
        return;
      }

      if (res.path) {
        let finalUrl = '';
        if (supabase) {
          const cleanPath = res.path.replace('avatars/', '');
          const { data } = supabase.storage.from('avatars').getPublicUrl(cleanPath);
          finalUrl = data.publicUrl;
        } else {
          finalUrl = URL.createObjectURL(file);
        }

        await updateUserAvatar(finalUrl);
        showToast('Profile photo updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Upload error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Save personal details (Strictly personal phone & blood group only)
  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    // Inline validation: phone must be 10 digits
    const cleanPhone = personalPhone.replace(/\D/g, '');
    if (personalPhone && (cleanPhone.length < 10 || cleanPhone.length > 12)) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUserProfile(currentUser.id, {
        personal_phone: cleanPhone,
        blood_group: bloodGroup,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setIsEditing(false);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update personal details.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Current and previous clients for this employee
  const currentAssignedTraders = traders.filter(
    (t) => (t.assigned_to === currentUser.id || t.employee_id === currentUser.id) && t.status === 'active'
  );
  const currentAssignedLeads = leads.filter(
    (l) => l.assigned_to === currentUser.id && l.status !== 'active_trader' && !l.is_archived
  );

  const previousAssignments = clientAssignments.filter(
    (a) => a.employee_id === currentUser.id && (a.status === 'transferred' || a.status === 'completed' || a.status === 'closed')
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
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

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar & Upload */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-xl border-3 border-white/20 overflow-hidden">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <label
                className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-bold"
                title="Upload Profile Picture"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 mb-0.5" />
                    <span>Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  {currentUser.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-blue-100 font-mono">
                  {currentUser.employee_code?.startsWith('T2T-')
                    ? currentUser.employee_code
                    : (currentUser.employee_code ? `T2T-${currentUser.employee_code.replace(/^T2T-?/i, '').toUpperCase()}` : `T2T-${currentUser.id.substring(0, 4).toUpperCase()}`)}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 font-medium">
                {currentUser.designation || 'Relationship Manager'} • {currentUser.department || 'Client Operations & Advisory'}
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs text-blue-200/70">
                <span>Reporting to: <strong className="text-white">{currentUser.manager_name || 'Karthik Muni'}</strong></span>
                <span>• Status: <strong className="text-emerald-400">Active Staff</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-blue-700" />
                <span>Edit Personal Details</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePersonalDetails}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Client Handling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Credentials & Coordinates */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Contact Coordinates</span>
            </h3>

            {/* Personal Phone */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Personal Mobile</span>
                </span>
                {currentUser.personal_phone && !isEditing && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.personal_phone!, 'personal')}
                    className="text-slate-400 hover:text-blue-600"
                  >
                    {copiedField === 'personal' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={personalPhone}
                  onChange={(e) => setPersonalPhone(e.target.value)}
                  placeholder="e.g. 9894685438"
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              ) : (
                <div className="text-xs font-bold text-slate-800 font-mono">
                  {currentUser.personal_phone || currentUser.phone || <span className="text-slate-400 font-normal italic">Not Provided</span>}
                </div>
              )}
              <span className="text-[10px] text-slate-400 block">Editable self-service field</span>
            </div>

            {/* Office Phone (Strictly Read-Only with Lock Badge) */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <span>Official Calling Number</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-[10px] font-bold text-blue-800">
                  <Lock className="w-2.5 h-2.5 text-blue-600" />
                  <span>Read-Only</span>
                </span>
              </div>
              <div className="text-xs font-bold text-blue-700 font-mono flex items-center justify-between">
                <span>{currentUser.office_phone || <span className="text-amber-700 font-normal italic">No Office SIM Assigned</span>}</span>
                {currentUser.office_phone && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentUser.office_phone!, 'office')}
                    className="text-blue-600 hover:text-blue-800 text-[10px] underline"
                  >
                    {copiedField === 'office' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Assigned exclusively by management. Contact your branch manager to update.
              </p>
            </div>

            {/* Blood Group */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Droplet className="w-3 h-3 text-rose-500" />
                <span>Blood Group</span>
              </span>
              {isEditing ? (
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg === 'Unknown' ? 'Unknown / Not Provided' : bg}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-bold text-slate-800">
                  {currentUser.blood_group && currentUser.blood_group !== 'Unknown' ? (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                      {currentUser.blood_group}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal italic">Unknown / Not Provided</span>
                  )}
                </div>
              )}
              <span className="text-[10px] text-slate-400 block">Personal health record</span>
            </div>

            {/* Reporting Manager Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-500" />
                <span>Assigned Manager</span>
              </span>
              <div className="text-xs font-bold text-slate-800">
                {currentUser.manager_name || 'Karthik Muni'}
              </div>
              <span className="text-[10px] text-slate-400 block">Branch operations lead</span>
            </div>
          </div>
        </div>

        {/* Right Columns: Client Portfolio & Historical Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Clients */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>My Active Client Portfolio</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Clients currently assigned to you for advisory and follow-ups
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                {currentAssignedTraders.length + currentAssignedLeads.length} Total
              </span>
            </div>

            {currentAssignedTraders.length === 0 && currentAssignedLeads.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No active clients assigned</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  New clients allocated by your manager will appear here immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {currentAssignedTraders.map((trader) => (
                  <div
                    key={trader.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{trader.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase font-mono">
                          Trader
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {trader.phone} • Joined: {trader.joined_at || 'Recent'}
                      </div>
                    </div>
                    {trader.total_profit_shared > 0 && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        {formatINR(trader.total_profit_shared)} Shared
                      </span>
                    )}
                  </div>
                ))}

                {currentAssignedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 uppercase font-mono">
                          Lead
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {lead.phone} • {lead.source}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Status: {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical / Previously Handled Clients */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>Previously Handled Clients</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Historical clients you managed before authorized handover or completion
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 font-mono">
                {previousAssignments.length} Records
              </span>
            </div>

            {previousAssignments.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <History className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">No previous handovers</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When clients are transferred to another advisor, records remain permanently documented here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {previousAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{asg.client_name}</span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-mono capitalize">
                        {asg.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {asg.client_phone} • Period: {asg.start_date.split('T')[0]} → {asg.end_date?.split('T')[0] || 'Handover'}
                    </div>
                    {asg.transferred_to_employee_name && (
                      <div className="text-[11px] text-slate-600">
                        Transferred To: <strong className="text-indigo-700">{asg.transferred_to_employee_name}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
