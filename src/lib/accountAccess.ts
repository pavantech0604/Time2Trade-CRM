import type { User } from '../types';

export function getAccountAccessIssue(profile: Pick<User, 'role' | 'is_active' | 'approval_status'>) {
  if (profile.approval_status === 'rejected') {
    return { success: false as const, status: 'rejected' as const, message: 'Your account application was rejected. Contact an administrator.' };
  }
  if (profile.approval_status !== 'approved' || profile.role === 'pending') {
    return { success: false as const, status: 'pending' as const, message: 'Your account is awaiting administrator approval. Your password was accepted.' };
  }
  if (profile.is_active !== true) {
    return { success: false as const, status: 'disabled' as const, message: 'Your account has been deactivated. Contact an administrator.' };
  }
  if (!['admin', 'manager', 'employee'].includes(profile.role)) {
    return { success: false as const, status: 'error' as const, message: 'Your staff role needs administrator review.' };
  }
  return null;
}
