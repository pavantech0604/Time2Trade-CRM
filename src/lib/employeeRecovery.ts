import { supabase } from './supabase';

// The deployed server controls recovery eligibility and validates its secret.
// No separate Vercel flag is needed to make the employee flow available.
export const isEmployeeRecoveryEnabled = true;

export async function employeeRecovery(body: Record<string, string>): Promise<{
  success: boolean; recoveryToken?: string; expiresAt?: string; restart?: boolean; message?: string; userId?: string; email?: string;
}> {
  if (!supabase || !isEmployeeRecoveryEnabled) {
    return { success: false, message: 'Employee recovery is not enabled. Contact an administrator.' };
  }
  const { data, error } = await supabase.functions.invoke('employee-password-recovery', { body });
  if (error) return { success: false, message: 'Employee recovery is unavailable. Contact an administrator.' };
  if (body.action === 'finish' && data?.success && data.userId && data.email) {
    // Clear only the recovered employee's legacy reset markers after Auth saved
    // the new password, so they are not prompted to reset a second time.
    try {
      localStorage.removeItem('time2trade_must_reset_active');
      for (const suffix of [data.userId, data.email.toLowerCase()]) {
        localStorage.removeItem(`time2trade_must_reset_${suffix}`);
        localStorage.removeItem(`time2trade_temp_pass_${suffix}`);
      }
    } catch { /* Password is saved even if browser storage is unavailable. */ }
  }
  return data || { success: false };
}
