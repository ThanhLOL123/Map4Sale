import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Service-role client — bypasses RLS; only ever lives inside Edge Functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export interface Caller {
  id: string;
  email: string;
}

/** Resolve the calling user from the request's Authorization header. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await anon.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}

/** True when the caller has an active admin profile. */
export async function callerIsAdmin(callerId: string): Promise<boolean> {
  const { data } = await serviceClient()
    .from('profiles')
    .select('role, is_active')
    .eq('id', callerId)
    .maybeSingle();
  return data?.role === 'admin' && data?.is_active === true;
}
