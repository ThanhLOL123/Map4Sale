// Edge Function: disable / enable a sales account or trigger a password
// reset (admin only). Uses the service-role key server-side (spec §4.3).

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  callerIsAdmin,
  corsHeaders,
  getCaller,
  json,
  serviceClient,
} from '../_shared/admin.ts';

type Action = 'disable' | 'enable' | 'reset_password';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Unauthorized' }, 401);
  if (!(await callerIsAdmin(caller.id))) return json({ error: 'Admin only' }, 403);

  const { action, user_id } = (await req.json().catch(() => ({}))) as {
    action?: Action;
    user_id?: string;
  };
  if (!user_id || !action) return json({ error: 'action and user_id are required' }, 400);
  if (user_id === caller.id) return json({ error: 'Cannot manage your own account' }, 400);

  const admin = serviceClient();
  const { data: target } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', user_id)
    .maybeSingle();
  if (!target) return json({ error: 'User not found' }, 404);

  switch (action) {
    case 'disable': {
      // Soft lock: is_active=false blocks data via RLS; the auth ban blocks
      // new sign-ins outright.
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: '876000h',
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ is_active: false }).eq('id', user_id);
      return json({ ok: true });
    }
    case 'enable': {
      const { error } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: 'none',
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ is_active: true }).eq('id', user_id);
      return json({ ok: true });
    }
    case 'reset_password': {
      // Sends the standard Supabase recovery email.
      const anon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      );
      const { error } = await anon.auth.resetPasswordForEmail(target.email);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    default:
      return json({ error: `Unknown action: ${action}` }, 400);
  }
});
