// Edge Function: record a successful login (spec §4.5).
// Reads the caller's real IP, resolves it to a city/country via ip-api.com,
// derives the browser/device from the user-agent, and inserts one row into
// login_logs with the service-role key (bypasses RLS).

import { corsHeaders, getCaller, json, serviceClient } from '../_shared/admin.ts';

interface GeoInfo {
  city: string;
  region: string;
  country: string;
}

async function resolveIp(ip: string): Promise<GeoInfo> {
  const empty: GeoInfo = { city: '', region: '', country: '' };
  // Localhost / private IPs (local testing) resolve to nothing.
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return empty;
  }
  try {
    // Free tier: HTTP only, ~45 req/min — ample for login events (spec §7.2).
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName,country`,
    );
    const data = await res.json();
    if (data.status !== 'success') return empty;
    return {
      city: data.city ?? '',
      region: data.regionName ?? '',
      country: data.country ?? '',
    };
  } catch {
    return empty;
  }
}

function parseBrowser(ua: string): string {
  if (!ua) return '';
  let browser = 'Khác';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} (${os})` : browser;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Unauthorized' }, 401);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const geo = await resolveIp(ip);
  const browser = parseBrowser(req.headers.get('user-agent') ?? '');

  const { error } = await serviceClient().from('login_logs').insert({
    user_id: caller.id,
    ip_address: ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    browser,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
