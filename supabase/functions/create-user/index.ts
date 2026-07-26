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
  const password = generatePassword();
  // No-email flow: creates the auth user with a random password and returns
  // it once so the admin can hand it to the sales rep directly. Avoids
  // Supabase's built-in mailer rate limit (~3-4 emails/hour).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '', role: 'sale' },
  });
  if (error) return json({ error: error.message }, 400);

  // The on_auth_user_created trigger creates the profile; sync the name in
  // case the trigger ran before metadata was applied.
  await admin
    .from('profiles')
    .update({ full_name: full_name ?? '' })
    .eq('id', data.user.id);

  return json({ user_id: data.user.id, password });
});

function generatePassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}
