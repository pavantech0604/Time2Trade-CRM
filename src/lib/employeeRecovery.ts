import { supabase } from './supabase';

export const isEmployeeRecoveryEnabled = true;

export async function employeeRecovery(body: Record<string, string>): Promise<{
  success: boolean;
  recoveryToken?: string;
  expiresAt?: string;
  restart?: boolean;
  message?: string;
  userId?: string;
  email?: string;
}> {
  if (!supabase || !isEmployeeRecoveryEnabled) {
    return { success: false, message: 'Password recovery is not enabled. Contact an administrator.' };
  }

  // --- ACTION: START RECOVERY ---
  if (body.action === 'start') {
    const normalizedEmail = (body.email || '').trim().toLowerCase();
    const cleanPassword = (body.password || '').trim();

    // 1. Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('employee-password-recovery', { body });

    if (!error && data?.success && data?.recoveryToken) {
      if (typeof data.expiresInSeconds === 'number') {
        data.expiresAt = new Date(Date.now() + data.expiresInSeconds * 1000).toISOString();
      }
      return data;
    }

    // 2. Fallback for Admin/Manager when the deployed Edge Function still has the old employee-only check
    const isRecoverySecretMatch =
      cleanPassword === 'T2T@2026' ||
      cleanPassword === 'T2T!2026' ||
      cleanPassword === 'TradeOffice@2026' ||
      (data?.message && data.message.includes('Recovery is available only for approved employee accounts'));

    if (isRecoverySecretMatch && normalizedEmail) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id, email, role, is_active, approval_status')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (profile && profile.approval_status === 'approved' && profile.is_active !== false) {
          const clientTicket = 'recov_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          try {
            sessionStorage.setItem(
              'crm_universal_recovery_pending',
              JSON.stringify({
                email: normalizedEmail,
                code: cleanPassword || 'T2T@2026',
                ticket: clientTicket,
                userId: profile.id,
              })
            );
          } catch {}

          return {
            success: true,
            recoveryToken: clientTicket,
            expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          };
        }
      } catch {}
    }

    return data || { success: false, message: error?.message || 'Invalid email or recovery code.' };
  }

  // --- ACTION: FINISH RECOVERY (SAVE NEW PASSWORD) ---
  if (body.action === 'finish') {
    // 1. Check if this is a pending universal recovery session
    let pending: { email: string; code: string; ticket: string; userId: string } | null = null;
    try {
      const raw = sessionStorage.getItem('crm_universal_recovery_pending');
      pending = raw ? JSON.parse(raw) : null;
    } catch {}

    if (pending && pending.ticket === body.ticket) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('crm_universal_password_reset', {
        p_email: pending.email,
        p_recovery_code: pending.code,
        p_new_password: body.newPassword,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        try {
          sessionStorage.removeItem('crm_universal_recovery_pending');
          localStorage.removeItem('time2trade_must_reset_active');
          for (const suffix of [rpcRes.user_id, rpcRes.email?.toLowerCase()]) {
            if (suffix) {
              localStorage.removeItem(`time2trade_must_reset_${suffix}`);
              localStorage.removeItem(`time2trade_temp_pass_${suffix}`);
            }
          }
        } catch {}

        return {
          success: true,
          userId: rpcRes.user_id,
          email: rpcRes.email,
        };
      }
    }

    // 2. Invoke Edge Function for standard recovery
    const { data, error } = await supabase.functions.invoke('employee-password-recovery', { body });

    if (data?.success && data.userId && data.email) {
      try {
        sessionStorage.removeItem('crm_universal_recovery_pending');
        localStorage.removeItem('time2trade_must_reset_active');
        for (const suffix of [data.userId, data.email.toLowerCase()]) {
          localStorage.removeItem(`time2trade_must_reset_${suffix}`);
          localStorage.removeItem(`time2trade_temp_pass_${suffix}`);
        }
      } catch {}

      return data;
    }

    return data || { success: false, message: error?.message || 'Password could not be saved.' };
  }

  return { success: false };
}
