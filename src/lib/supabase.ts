import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Demo mode: no Supabase credentials configured. The app serves the bundled
 * sample dataset, skips authentication and keeps admin edits in memory.
 */
export const isDemoMode = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!);

/** Non-null client for code paths that only run in live mode. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase chưa được cấu hình (đang ở chế độ demo).');
  return supabase;
}
