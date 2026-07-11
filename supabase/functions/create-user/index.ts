// Edge Function: create a sales account (admin only).
// The Supabase Admin API needs the service-role key, so this must run
// server-side — never in frontend code (spec §4.3).

import {
  callerIsAdmin,
  corsHeaders,
  getCaller,
  json,
  serviceClient,
} from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Unauthorized' }, 401);
  if (!(await callerIsAdmin(caller.id))) return json({ error: 'Admin only' }, 403);

  const { email, full_name } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'Invalid email' }, 400);
  }

  const admin = serviceClient();
  // Invite flow: creates the auth user and emails a password-setup link.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? '', role: 'sale' },
  });
  if (error) return json({ error: error.message }, 400);

  // The on_auth_user_created trigger creates the profile; sync the name in
  // case the trigger ran before metadata was applied.
  await admin
    .from('profiles')
    .update({ full_name: full_name ?? '' })
    .eq('id', data.user.id);

  return json({ user_id: data.user.id });
});
