import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Phone,
  Building2,
  Droplet,
  Lock,
  Edit3,
  Check,
  Copy,
  Save,
  ShieldCheck,
  Sparkles,
  Loader2,
  Mail,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadFileToBucket, supabase } from '../../lib/supabase';
import { User } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const { currentUser, updateUserAvatar, updateUserProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // The active user being displayed: targetUser if provided, else currentUser
  const activeUser = targetUser || currentUser;

  // Authorization checks
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isSelf = currentUser?.id === activeUser?.id;
  const canEditPersonalNumber = isSelf || isAdminOrManager;
  const canEditOfficeNumber = isAdminOrManager; // ONLY Admin and Manager can update office phone!

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [personalPhone, setPersonalPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Sync state whenever activeUser changes or modal opens
  useEffect(() => {
    if (isOpen && activeUser) {
      setPersonalPhone(
        activeUser.personal_phone ||
          activeUser.personal_number ||
          activeUser.phone ||
          ''
      );
      setOfficePhone(
        activeUser.office_phone || activeUser.office_number || ''
      );
      setBloodGroup(activeUser.blood_group || '');
      setIsEditing(false);
      setSuccess(null);
      setErrorMessage(null);
    }
  }, [isOpen, activeUser?.id]);

  if (!isOpen || !activeUser || !currentUser) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSelf) return;

    setIsUploading(true);
    setSuccess(null);
    setErrorMessage(null);

    const res = await uploadFileToBucket('avatars', file, `user_${activeUser.id}`);

    if (res.error) {
      setErrorMessage(`Upload failed: ${res.error.message || 'Please check network connection'}`);
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
      setSuccess('Profile avatar updated!');
      setTimeout(() => setSuccess(null), 2500);
    }

    setIsUploading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(null);
    setErrorMessage(null);

    try {
      const payload: {
        personal_phone?: string;
        office_phone?: string;
        blood_group?: string;
      } = {
        personal_phone: personalPhone.trim(),
        blood_group: bloodGroup.trim(),
      };

      // Only include office_phone if user has permission
      if (canEditOfficeNumber) {
        payload.office_phone = officePhone.trim();
      }

      const res = await updateUserProfile(activeUser.id, payload);

      if (res.success) {
        setSuccess(res.message || 'Profile saved successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setErrorMessage(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 my-auto">
        {/* Banner with Glowing Gradient */}
        <div className="h-32 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 relative p-4 flex items-start justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Time2Trade Profile ID</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 pb-6 pt-0 relative">
          <div className="flex flex-col items-center">
            {/* Avatar Section */}
            <div className="relative group w-24 h-24 -mt-12 mb-3 shrink-0">
              {activeUser.avatar_url ? (
                <img
                  src={activeUser.avatar_url}
                  alt={activeUser.name}
                  className="w-full h-full rounded-2xl object-cover shadow-xl border-4 border-white bg-white"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl border-4 border-white">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Upload trigger - only if viewing self */}
              {isSelf && (
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {/* Name, Role & Employee Code */}
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-1.5">
                <h4 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  {activeUser.name}
                </h4>
                <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
              </div>

              <div className="flex items-center justify-center gap-2 mt-1 mb-4 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {activeUser.role.replace(/_/g, ' ')}
                </span>
                {activeUser.employee_code && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    ID: {activeUser.employee_code}
                  </span>
                )}
                <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Feedback messages */}
              {errorMessage && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {success && (
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {/* Action Bar: Toggle Edit Details */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Employee Directory Card
                </span>

                {(canEditPersonalNumber || canEditOfficeNumber) && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl transition-all cursor-pointer ${
                      isEditing
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-3.5 h-3.5" /> Cancel Edit
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" /> Edit Information
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Form or Display View */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
                  {/* Personal Contact Number Input */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1 font-mono uppercase">
                      <Phone className="w-3.5 h-3.5 text-blue-600" /> Personal Number
                      <span className="text-emerald-600 text-[10px] font-sans font-normal">(Editable by employee)</span>
                    </label>
                    <input
                      type="text"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 transition-all outline-none"
                    />
                  </div>

                  {/* Blood Group Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1 font-mono uppercase">
                      <Droplet className="w-3.5 h-3.5 text-rose-600" /> Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 transition-all outline-none cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Office Number - Permission Controlled */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 font-mono uppercase">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Office Phone Number
                      </label>
                      {!canEditOfficeNumber && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-sans">
                          <Lock className="w-2.5 h-2.5" /> Admin / Manager Only
                        </span>
                      )}
                    </div>

                    {canEditOfficeNumber ? (
                      <div>
                        <input
                          type="text"
                          value={officePhone}
                          onChange={(e) => setOfficePhone(e.target.value)}
                          placeholder="e.g. 080-41234567 / Desk 12"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 transition-all outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          You have Admin/Manager privileges to set this employee's official desk number.
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={officePhone || 'No official number assigned'}
                          disabled
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed select-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save button */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Interactive Display Cards */
                <div className="space-y-2.5 text-left">
                  {/* Personal Number Card */}
                  <div className="bg-slate-50 hover:bg-blue-50/50 p-3 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                          Personal Number
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {personalPhone || (
                            <span className="text-slate-400 italic font-normal">Not Provided</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {personalPhone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(personalPhone, 'personal')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-600 shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Copy Personal Number"
                      >
                        {copiedField === 'personal' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Office Number Card */}
                  <div className="bg-slate-50 hover:bg-indigo-50/50 p-3 rounded-2xl border border-slate-200/80 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                            Office Number
                          </span>
                          {!canEditOfficeNumber && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                              <Lock className="w-2.5 h-2.5" /> Managed
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {officePhone || (
                            <span className="text-slate-400 italic font-normal">Not Assigned Yet</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {officePhone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(officePhone, 'office')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Copy Office Number"
                      >
                        {copiedField === 'office' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Blood Group & Email 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Blood Group */}
                    <div className="bg-slate-50 hover:bg-rose-50/50 p-3 rounded-2xl border border-slate-200/80 transition-all">
                      <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                        <Droplet className="w-3.5 h-3.5 fill-rose-500/20" />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                          Blood Group
                        </span>
                      </div>
                      <span className="text-xs font-black text-rose-700 block">
                        {bloodGroup ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-100/70 border border-rose-200 text-rose-800">
                            {bloodGroup}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Not Set</span>
                        )}
                      </span>
                    </div>

                    {/* Email summary */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 transition-all overflow-hidden">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                          Login Email
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate block font-mono" title={activeUser.email}>
                        {activeUser.email}
                      </span>
                    </div>
                  </div>

                  {/* Info Notice about Office Phone permissions */}
                  {!canEditOfficeNumber && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[10px] text-slate-500 leading-relaxed font-sans">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> Employees can update their Personal Number anytime. Office phone numbers are issued and maintained by Administrator / Manager.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
