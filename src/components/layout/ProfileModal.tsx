import React, { useState } from 'react';
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Update Profile</h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative group w-24 h-24 mb-6">
              {currentUser.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt={currentUser.name} 
                  className="w-full h-full rounded-full object-cover shadow-md border-4 border-white"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-md border-4 border-white">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
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

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-800">{currentUser.name}</h4>
              <p className="text-xs font-semibold text-slate-500 capitalize">{currentUser.role.replace(/_/g, ' ')}</p>
            </div>
            
            {success && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                Profile picture updated!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
