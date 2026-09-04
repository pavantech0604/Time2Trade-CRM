import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadFileToBucket, supabase } from '../../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserAvatar } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSuccess(false);

    const res = await uploadFileToBucket('avatars', file, `user_${currentUser.id}`);

    if (res.error) {
      alert(`Error uploading file: ${res.error.message}`);
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
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }
    
    setIsUploading(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-brand-primary to-brand-primaryLight relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col items-center">
            {/* Avatar - overlaps banner */}
            <div className="relative group w-28 h-28 -mt-14 mb-4">
              {currentUser.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt={currentUser.name} 
                  className="w-full h-full rounded-full object-cover shadow-lg border-4 border-white bg-white"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-white">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
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
            </div>

            <div className="text-center w-full">
              <h4 className="text-xl font-black text-slate-800 tracking-tight">{currentUser.name}</h4>
              <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mt-1 mb-6">
                {currentUser.role.replace(/_/g, ' ')}
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 w-full space-y-3 text-left border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Email</span>
                  <span className="text-slate-700 font-bold truncate max-w-[150px]">{currentUser.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Phone</span>
                  <span className="text-slate-700 font-bold">{currentUser.phone || 'Not Provided'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Status</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Account
                  </span>
                </div>
              </div>
            </div>
            
            {success && (
              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl w-full justify-center">
                <CheckCircle2 className="w-4 h-4" />
                Profile picture updated!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
