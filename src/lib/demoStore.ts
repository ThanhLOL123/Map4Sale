import sampleData from '../data/universities.sample.json';
import type { LoginLog, Profile, University, UniversityInput } from './types';

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
    login_at: '2026-07-10T01:12:00Z',
    ip_address: '113.161.72.10',
    city: 'Hà Nội',
    region: 'Hanoi',
    country: 'Vietnam',
    browser: 'Chrome (Windows)',
  },
  {
    id: 'log-2',
    user_id: 'demo-sale-0002',
    login_at: '2026-07-10T02:40:00Z',
    ip_address: '115.78.5.44',
    city: 'TP. Hồ Chí Minh',
    region: 'Ho Chi Minh',
    country: 'Vietnam',
    browser: 'Safari (macOS)',
  },
  {
    id: 'log-3',
    user_id: 'demo-sale-0001',
    login_at: '2026-07-09T08:03:00Z',
    ip_address: '175.213.9.81',
    city: 'Seoul',
    region: 'Seoul',
    country: 'South Korea',
    browser: 'Chrome (Android)',
  },
  {
    id: 'log-4',
    user_id: 'demo-sale-0003',
    login_at: '2026-07-08T22:55:00Z',
    ip_address: '89.187.178.12',
    city: 'Frankfurt',
    region: 'Hesse',
    country: 'Germany',
    browser: 'Firefox (Windows)',
  },
];

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
};
