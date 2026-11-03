import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'POST required.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Sign in as an administrator.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller, error: callerError } = await admin.auth.getUser(authorization.slice(7));
  if (callerError || !caller.user) return reply(401, { error: 'Your session is invalid or expired.' });
  const { data: profile, error: profileError } = await admin.from('users')
    .select('role,is_active,approval_status').eq('id', caller.user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin' || !profile.is_active || profile.approval_status !== 'approved') {
    return reply(403, { error: 'Administrator access required.' });
  }

  try {
    const { userId, password } = await request.json();
    if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId) || typeof password !== 'string' || password.length < 6) {
      return reply(400, { error: 'A valid user ID and password of at least 6 characters are required.' });
    }
    if (userId === caller.user.id) return reply(400, { error: 'Use your own password change screen for your account.' });
    const { data: target, error: targetError } = await admin.from('users')
      .select('id,must_reset_password,is_active,approval_status').eq('id', userId).maybeSingle();
    if (targetError || !target) return reply(404, { error: 'Employee profile not found.' });
    if (!target.is_active || target.approval_status !== 'approved') {
      return reply(403, { error: 'Approve and activate the account before resetting its password.' });
    }
    const { error: flagError } = await admin.from('users').update({ must_reset_password: true }).eq('id', userId);
    if (flagError) return reply(500, { error: 'Could not set the password reset requirement.' });
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password });
    if (passwordError) {
      await admin.from('users').update({ must_reset_password: target.must_reset_password }).eq('id', userId);
      return reply(400, { error: passwordError.message });
    }
    return reply(200, { success: true });
  } catch {
    return reply(400, { error: 'Password reset could not be completed. Check the request and retry.' });
  }
});
