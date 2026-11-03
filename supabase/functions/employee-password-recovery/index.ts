import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// Expected credential rejections are application results, not failed HTTP calls.
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function sameSecret(value: string, secret: string): Promise<boolean> {
  const left = await digest(value), right = await digest(secret);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ success: false, message: 'POST required.' }, 405);
  const recoverySecret = Deno.env.get('EMPLOYEE_RECOVERY_PASSWORD');
  if (!recoverySecret) return reply({ success: false, message: 'Employee recovery is not configured. Contact an administrator.' });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await request.json();
    if (body.action === 'start') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || email.length > 254 || password.length > 1024) return reply({ success: false });
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const { data: allowed, error: limitError } = await admin.rpc('crm_allow_employee_recovery', {
        email_digest: await digest(email), ip_digest: await digest(ip),
      });
      if (limitError) return reply({ success: false, message: 'Employee recovery is unavailable. Contact an administrator.' });
      if (!allowed) return reply({ success: false, message: 'Recovery attempt limit reached. Wait 15 minutes or contact an administrator.' });
      if (!await sameSecret(password, recoverySecret)) return reply({ success: false });
      const { data: profile, error } = await admin.from('users')
        .select('id,email,role,is_active,approval_status').eq('email', email).maybeSingle();
      if (error || profile?.role !== 'employee' || !profile.is_active || profile.approval_status !== 'approved') {
        return reply({ success: false, message: 'Recovery is available only for approved employee accounts. Contact an administrator.' });
      }
      const { data: identity, error: identityError } = await admin.auth.admin.getUserById(profile.id);
      if (identityError || identity.user?.email?.toLowerCase() !== email ||
          (identity.user?.banned_until && Date.parse(identity.user.banned_until) > Date.now())) {
        return reply({ success: false, message: 'Your account needs administrator review before recovery.' });
      }
      const random = crypto.getRandomValues(new Uint8Array(32));
      const ticket = [...random].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      const { error: ticketError } = await admin.from('employee_recovery_tickets').insert({
        token_hash: await digest(ticket), user_id: profile.id,
        expires_at: expiresAt,
      });
      if (ticketError) return reply({ success: false, message: 'Recovery could not be started. Contact an administrator.' });
      // No Auth session or employee records are returned to this caller.
      return reply({ success: true, recoveryToken: ticket, expiresAt });
    }

    if (body.action === 'finish') {
      if (typeof body.ticket !== 'string' || !/^[a-f0-9]{64}$/.test(body.ticket) ||
          typeof body.newPassword !== 'string' || body.newPassword.length < 8 || body.newPassword.length > 128) {
        return reply({ success: false, message: 'Enter a new password with 8–128 characters.' });
      }
      if (await sameSecret(body.newPassword, recoverySecret)) {
        return reply({ success: false, message: 'Choose a personal password different from the shared recovery code.' });
      }
      const { data: userId, error: ticketError } = await admin.rpc('crm_consume_employee_recovery', {
        ticket_digest: await digest(body.ticket),
      });
      if (ticketError || !userId) return reply({ success: false, restart: true, message: 'This reset request expired or was already used. Start recovery again.' });
      // Recheck eligibility and the Auth ban immediately before changing anything.
      const { data: profile, error: profileError } = await admin.from('users')
        .select('id,email,role,is_active,approval_status').eq('id', userId).maybeSingle();
      const { data: identity, error: identityError } = await admin.auth.admin.getUserById(userId);
      if (profileError || profile?.role !== 'employee' || !profile.is_active || profile.approval_status !== 'approved' ||
          identityError || identity.user?.email?.toLowerCase() !== profile.email.toLowerCase() ||
          (identity.user?.banned_until && Date.parse(identity.user.banned_until) > Date.now())) {
        return reply({ success: false, restart: true, message: 'Your account needs administrator review before recovery.' });
      }
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: body.newPassword, email_confirm: true,
      });
      if (updateError) return reply({ success: false, restart: true, message: `${updateError.message} Start recovery again to retry.` });
      await admin.from('users').update({ must_reset_password: false }).eq('id', userId);
      return reply({ success: true, userId, email: profile.email });
    }
    return reply({ success: false, message: 'Unknown recovery action.' });
  } catch {
    return reply({ success: false, message: 'Employee recovery could not be completed. Contact an administrator.' });
  }
});
