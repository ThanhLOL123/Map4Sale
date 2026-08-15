import { demoStore } from './demoStore';
import { isDemoMode, requireSupabase } from './supabase';
import type {
  ActivityEvent,
  ActivitySummaryRow,
  LoginKind,
  LoginLog,
  Profile,
  University,
  UniversityInput,
} from './types';

const BUCKET = 'university-images';

// ---------------------------------------------------------------------------
// Universities
// ---------------------------------------------------------------------------

export async function fetchUniversities(): Promise<University[]> {
  if (isDemoMode) return demoStore.listUniversities();
  const { data, error } = await requireSupabase()
    .from('universities')
    .select('*')
    .order('name_vi');
  if (error) throw error;
  return (data ?? []).map(normalizeUniversity);
}

export async function fetchUniversity(id: string): Promise<University | null> {
  if (isDemoMode) return demoStore.getUniversity(id) ?? null;
  const { data, error } = await requireSupabase()
    .from('universities')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeUniversity(data) : null;
}

export async function saveUniversity(input: UniversityInput): Promise<University> {
  if (isDemoMode) return demoStore.saveUniversity(input);
  const { data, error } = await requireSupabase()
    .from('universities')
    .upsert({ ...input, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return normalizeUniversity(data);
}

export async function deleteUniversity(u: University): Promise<void> {
  if (isDemoMode) {
    demoStore.deleteUniversity(u.id);
    return;
  }
  const supabase = requireSupabase();
  const { error } = await supabase.from('universities').delete().eq('id', u.id);
  if (error) throw error;
  // Best-effort Storage cleanup so no orphaned files remain (spec §5.4).
  void removeUniversityFolder(u.id);
}

/** jsonb columns may come back as null; keep the app's invariants tight. */
function normalizeUniversity(row: Record<string, unknown>): University {
  return {
    ...(row as unknown as University),
    image_urls: (row.image_urls as string[] | null) ?? [],
    video_urls: (row.video_urls as string[] | null) ?? [],
    majors: (row.majors as string[] | null) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Images (Supabase Storage) — spec §5
// ---------------------------------------------------------------------------

/**
 * Upload a media file chosen by the admin and return its URL.
 * target = 'logo'  → single logo image
 * target = 'photo' → campus photo (appended to the gallery by the form)
 * target = 'video' → campus video file (appended to video_urls by the form)
 * The caller persists the returned URL on the university record.
 */
export async function uploadUniversityImage(
  universityId: string,
  file: File,
  target: 'logo' | 'photo' | 'video',
): Promise<string> {
  if (isDemoMode) return URL.createObjectURL(file);

  const supabase = requireSupabase();
  const folder = target === 'logo' ? 'logo' : target === 'video' ? 'videos' : 'photos';
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${universityId}/${folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Delete a stored image by its public URL (no-op for demo blob: URLs). */
export async function deleteUniversityImage(url: string): Promise<void> {
  if (isDemoMode) return;
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  await requireSupabase().storage.from(BUCKET).remove([path]);
}

async function removeUniversityFolder(universityId: string): Promise<void> {
  const supabase = requireSupabase();
  for (const folder of ['logo', 'photos', 'videos']) {
    const prefix = `${universityId}/${folder}`;
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 });
    const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }
}

// ---------------------------------------------------------------------------
// Geocoding (Nominatim / OpenStreetMap) — spec §4.4
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Nominatim trả về lỗi ${res.status}`);
  const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  };
}

// ---------------------------------------------------------------------------
// Accounts (admin) — privileged actions go through Edge Functions (spec §4.3)
// ---------------------------------------------------------------------------

export async function fetchProfiles(): Promise<Profile[]> {
  if (isDemoMode) return demoStore.listProfiles();
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createSaleAccount(email: string, fullName: string): Promise<string> {
  if (isDemoMode) {
    demoStore.createProfile(email, fullName);
    return 'demo-password';
  }
  const { data, error } = await requireSupabase().functions.invoke<{ password: string }>(
    'create-user',
    { body: { email, full_name: fullName } },
  );
  if (error) throw error;
  return data!.password;
}

export async function setAccountActive(userId: string, isActive: boolean): Promise<void> {
  if (isDemoMode) {
    demoStore.setProfileActive(userId, isActive);
    return;
  }
  const { error } = await requireSupabase().functions.invoke('manage-user', {
    body: { action: isActive ? 'enable' : 'disable', user_id: userId },
  });
  if (error) throw error;
}

export async function resetAccountPassword(userId: string): Promise<string> {
  if (isDemoMode) return 'demo-password';
  const { data, error } = await requireSupabase().functions.invoke<{ password: string }>(
    'manage-user',
    { body: { action: 'reset_password', user_id: userId } },
  );
  if (error) throw error;
  return data!.password;
}

// ---------------------------------------------------------------------------
// Login logs — spec §4.5
// ---------------------------------------------------------------------------

export async function fetchLoginLogs(): Promise<LoginLog[]> {
  if (isDemoMode) return demoStore.listLoginLogs();
  const { data, error } = await requireSupabase()
    .from('login_logs')
    .select('*, profiles(email, full_name)')
    .order('login_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

/**
 * Fire-and-forget: record the access server-side (IP → city/country, UA).
 * `kind` distinguishes a password sign-in from the app being reopened with a
 * session that was still valid; the Edge Function whitelists it.
 */
export function logLogin(kind: LoginKind = 'login'): void {
  if (isDemoMode) return;
  void requireSupabase()
    .functions.invoke('log-login', { body: { kind } })
    .catch((err) => console.warn('log-login failed:', err));
}

// ---------------------------------------------------------------------------
// Activity tracking — see src/lib/activity.ts for the buffering side
// ---------------------------------------------------------------------------

/** Rows returned by one drill-down query; the page says so when it hits this. */
export const ACTIVITY_EVENT_LIMIT = 300;

export async function fetchActivitySummary(
  fromIso: string,
  toIso: string,
): Promise<ActivitySummaryRow[]> {
  if (isDemoMode) return demoStore.activitySummary(fromIso, toIso);
  const { data, error } = await requireSupabase()
    .rpc('activity_summary', { from_ts: fromIso, to_ts: toIso });
  if (error) throw error;
  return data ?? [];
}

export async function fetchActivityEvents(opts: {
  userId?: string;
  fromIso: string;
  toIso: string;
}): Promise<ActivityEvent[]> {
  if (isDemoMode) return demoStore.listActivityEvents(opts);
  let query = requireSupabase()
    .from('activity_events')
    .select('*, profiles(email, full_name)')
    .gte('occurred_at', opts.fromIso)
    .lt('occurred_at', opts.toIso);
  if (opts.userId) query = query.eq('user_id', opts.userId);
  const { data, error } = await query
    .order('occurred_at', { ascending: false })
    .limit(ACTIVITY_EVENT_LIMIT);
  if (error) throw error;
  return data ?? [];
}
