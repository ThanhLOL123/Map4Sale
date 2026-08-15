import sampleData from '../data/universities.sample.json';
import type {
  ActivityEvent,
  ActivitySummaryRow,
  LoginLog,
  Profile,
  University,
  UniversityInput,
} from './types';

/**
 * Fixture timestamps are relative to load time, not hardcoded dates: the
 * activity screen defaults to the last 7 days, and fixed dates would age out
 * and leave the demo showing an empty screen.
 */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

/**
 * In-memory data store used when the app runs without Supabase credentials
 * (demo mode). Admin edits work but are lost on page reload.
 */

let universities: University[] = (sampleData as University[]).map((u) => ({ ...u }));

export const DEMO_ADMIN: Profile = {
  id: 'demo-admin-0000',
  email: 'admin@demo.map4sale',
  full_name: 'Quản trị viên (Demo)',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-05T08:00:00Z',
};

let profiles: Profile[] = [
  DEMO_ADMIN,
  {
    id: 'demo-sale-0001',
    email: 'lan.nguyen@demo.map4sale',
    full_name: 'Nguyễn Thị Lan',
    role: 'sale',
    is_active: true,
    created_at: '2026-02-10T03:20:00Z',
  },
  {
    id: 'demo-sale-0002',
    email: 'minh.tran@demo.map4sale',
    full_name: 'Trần Quang Minh',
    role: 'sale',
    is_active: true,
    created_at: '2026-03-02T09:45:00Z',
  },
  {
    id: 'demo-sale-0003',
    email: 'huong.pham@demo.map4sale',
    full_name: 'Phạm Thu Hương',
    role: 'sale',
    is_active: false,
    created_at: '2026-04-18T07:10:00Z',
  },
];

let loginLogs: LoginLog[] = [
  {
    id: 'log-1',
    user_id: 'demo-sale-0001',
    login_at: hoursAgo(3),
    ip_address: '113.161.72.10',
    city: 'Hà Nội',
    region: 'Hanoi',
    country: 'Vietnam',
    browser: 'Chrome (Windows)',
    kind: 'login',
  },
  {
    id: 'log-2',
    user_id: 'demo-sale-0002',
    login_at: hoursAgo(6),
    ip_address: '115.78.5.44',
    city: 'TP. Hồ Chí Minh',
    region: 'Ho Chi Minh',
    country: 'Vietnam',
    browser: 'Safari (macOS)',
    kind: 'login',
  },
  {
    id: 'log-3',
    user_id: 'demo-sale-0001',
    login_at: hoursAgo(27),
    ip_address: '175.213.9.81',
    city: 'Seoul',
    region: 'Seoul',
    country: 'South Korea',
    browser: 'Chrome (Android)',
    kind: 'resume',
  },
  {
    id: 'log-4',
    user_id: 'demo-sale-0002',
    login_at: hoursAgo(50),
    ip_address: '115.78.5.44',
    city: 'TP. Hồ Chí Minh',
    region: 'Ho Chi Minh',
    country: 'Vietnam',
    browser: 'Safari (macOS)',
    kind: 'resume',
  },
  {
    id: 'log-5',
    user_id: 'demo-sale-0003',
    login_at: hoursAgo(74),
    ip_address: '89.187.178.12',
    city: 'Frankfurt',
    region: 'Hesse',
    country: 'Germany',
    browser: 'Firefox (Windows)',
    kind: 'login',
  },
];

/** Sample ids from universities.sample.json, so the drill-down links up. */
const DEMO_SCHOOLS: Array<[string, string]> = [
  ['d1000000-0000-4000-8000-000000000001', 'Đại học Quốc gia Seoul'],
  ['d1000000-0000-4000-8000-000000000002', 'Viện KH&CN tiên tiến Hàn Quốc (KAIST)'],
  ['d1000000-0000-4000-8000-000000000003', 'Đại học Yonsei'],
  ['d1000000-0000-4000-8000-000000000004', 'Đại học Korea'],
  ['d1000000-0000-4000-8000-000000000005', 'Đại học KH&CN Pohang (POSTECH)'],
];

function demoSchoolView(id: string, userId: string, h: number, school: number): ActivityEvent {
  const [universityId, name] = DEMO_SCHOOLS[school];
  return {
    id,
    user_id: userId,
    occurred_at: hoursAgo(h),
    event_type: 'school_view',
    university_id: universityId,
    detail: name,
    result_count: null,
  };
}

let activityEvents: ActivityEvent[] = [
  demoSchoolView('act-1', 'demo-sale-0001', 2.9, 0),
  demoSchoolView('act-2', 'demo-sale-0001', 2.8, 2),
  demoSchoolView('act-3', 'demo-sale-0001', 2.7, 3),
  {
    id: 'act-4',
    user_id: 'demo-sale-0001',
    occurred_at: hoursAgo(2.6),
    event_type: 'search',
    university_id: null,
    detail: 'seoul',
    result_count: 5,
  },
  {
    id: 'act-5',
    user_id: 'demo-sale-0001',
    occurred_at: hoursAgo(2.5),
    event_type: 'filter',
    university_id: null,
    detail: 'region=Seoul',
    result_count: 11,
  },
  demoSchoolView('act-6', 'demo-sale-0001', 2.4, 1),
  demoSchoolView('act-7', 'demo-sale-0001', 26.5, 4),
  {
    id: 'act-8',
    user_id: 'demo-sale-0001',
    occurred_at: hoursAgo(26.4),
    event_type: 'search',
    university_id: null,
    detail: 'kaist',
    result_count: 1,
  },
  demoSchoolView('act-9', 'demo-sale-0002', 5.8, 3),
  demoSchoolView('act-10', 'demo-sale-0002', 5.7, 4),
  {
    id: 'act-11',
    user_id: 'demo-sale-0002',
    occurred_at: hoursAgo(5.6),
    event_type: 'filter',
    university_id: null,
    detail: 'maxTuition=4',
    result_count: 9,
  },
  {
    id: 'act-12',
    user_id: 'demo-sale-0002',
    occurred_at: hoursAgo(5.5),
    event_type: 'search',
    university_id: null,
    detail: 'y khoa',
    result_count: 0,
  },
  {
    id: 'act-13',
    user_id: 'demo-sale-0002',
    occurred_at: hoursAgo(5.4),
    event_type: 'filter',
    university_id: null,
    detail: 'reset',
    result_count: 22,
  },
  demoSchoolView('act-14', 'demo-sale-0002', 49.5, 0),
  demoSchoolView('act-15', 'demo-sale-0002', 49.4, 1),
  demoSchoolView('act-16', 'demo-sale-0003', 73.5, 2),
  {
    id: 'act-17',
    user_id: 'demo-sale-0003',
    occurred_at: hoursAgo(73.4),
    event_type: 'search',
    university_id: null,
    detail: 'busan',
    result_count: 2,
  },
];

let activitySeq = activityEvents.length;

function withProfile(log: LoginLog): LoginLog {
  const p = profiles.find((x) => x.id === log.user_id);
  return { ...log, profiles: p ? { email: p.email, full_name: p.full_name } : null };
}

export const demoStore = {
  listUniversities(): University[] {
    return universities.map((u) => ({ ...u }));
  },
  getUniversity(id: string): University | undefined {
    const u = universities.find((x) => x.id === id);
    return u ? { ...u } : undefined;
  },
  saveUniversity(input: UniversityInput): University {
    const record: University = { ...input, updated_at: new Date().toISOString() };
    const idx = universities.findIndex((x) => x.id === input.id);
    if (idx >= 0) universities[idx] = record;
    else universities = [...universities, record];
    return { ...record };
  },
  deleteUniversity(id: string): void {
    universities = universities.filter((x) => x.id !== id);
  },

  listProfiles(): Profile[] {
    return profiles.map((p) => ({ ...p }));
  },
  createProfile(email: string, fullName: string): Profile {
    const p: Profile = {
      id: `demo-sale-${crypto.randomUUID().slice(0, 8)}`,
      email,
      full_name: fullName,
      role: 'sale',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    profiles = [...profiles, p];
    return { ...p };
  },
  setProfileActive(id: string, isActive: boolean): void {
    profiles = profiles.map((p) => (p.id === id ? { ...p, is_active: isActive } : p));
  },

  listLoginLogs(): LoginLog[] {
    return loginLogs
      .map(withProfile)
      .sort((a, b) => b.login_at.localeCompare(a.login_at));
  },

  recordActivityEvents(rows: Omit<ActivityEvent, 'id'>[]): void {
    // Demo has no auth, so events are attributed to the demo admin.
    activityEvents = [
      ...activityEvents,
      ...rows.map((r) => ({ ...r, id: `act-${++activitySeq}`, user_id: DEMO_ADMIN.id })),
    ];
  },

  listActivityEvents(opts: { userId?: string; fromIso: string; toIso: string }): ActivityEvent[] {
    return activityEvents
      .filter((e) => {
        if (opts.userId && e.user_id !== opts.userId) return false;
        return e.occurred_at >= opts.fromIso && e.occurred_at < opts.toIso;
      })
      .map((e) => ({
        ...e,
        profiles: (() => {
          const p = profiles.find((x) => x.id === e.user_id);
          return p ? { email: p.email, full_name: p.full_name } : null;
        })(),
      }))
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 300);
  },

  /** JS mirror of the activity_summary RPC (see migration 0006). */
  activitySummary(fromIso: string, toIso: string): ActivitySummaryRow[] {
    return profiles
      .map((p) => {
        const logins = loginLogs.filter(
          (l) => l.user_id === p.id && l.login_at >= fromIso && l.login_at < toIso,
        );
        const events = activityEvents.filter(
          (e) => e.user_id === p.id && e.occurred_at >= fromIso && e.occurred_at < toIso,
        );
        const times = [...logins.map((l) => l.login_at), ...events.map((e) => e.occurred_at)];
        return {
          user_id: p.id,
          full_name: p.full_name,
          email: p.email,
          last_access_at: times.length ? times.sort()[times.length - 1] : null,
          sessions: logins.length,
          actions: events.length,
          // count(distinct) skips nulls in Postgres; match that here.
          schools_viewed: new Set(
            events
              .filter((e) => e.event_type === 'school_view' && e.university_id)
              .map((e) => e.university_id),
          ).size,
          searches: events.filter((e) => e.event_type === 'search').length,
        };
      })
      .sort((a, b) => (b.last_access_at ?? '').localeCompare(a.last_access_at ?? ''));
  },
};
