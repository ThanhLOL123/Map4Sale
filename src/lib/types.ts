export type UniversityType = 'public' | 'private';

export interface University {
  id: string;
  name_kr: string;
  name_en: string;
  name_vi: string;
  logo_url: string | null;
  image_urls: string[];
  video_urls: string[];
  lat: number;
  lng: number;
  city: string;
  region: string;
  type: UniversityType;
  ranking: number | null;
  is_featured: boolean;
  majors: string[];
  /** Rich-text faculty/major table for the profile; `majors` drives filtering. */
  majors_detail: string;
  tuition: string;
  scholarship: string;
  topik_req: string;
  ielts_req: string;
  gpa_req: string;
  dorm_info: string;
  living_cost: string;
  important_notes: string;
  sale_notes: string;
  updated_at: string;
}

export type UniversityInput = Omit<University, 'updated_at'>;

export type Role = 'admin' | 'sale';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

/** 'login' = password sign-in, 'resume' = app opened with a live session. */
export type LoginKind = 'login' | 'resume';

export interface LoginLog {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  kind: LoginKind;
  profiles?: Pick<Profile, 'email' | 'full_name'> | null;
}

/** Kept in step with the check constraint on activity_events.event_type. */
export type ActivityEventType = 'school_view' | 'search' | 'filter';

export interface ActivityEvent {
  id: string;
  user_id: string;
  occurred_at: string;
  event_type: ActivityEventType;
  university_id: string | null;
  /** School name at view time, the settled query, or `region=Seoul` / `reset`. */
  detail: string;
  result_count: number | null;
  profiles?: Pick<Profile, 'email' | 'full_name'> | null;
}

/** One row per staff member, as returned by the activity_summary RPC. */
export interface ActivitySummaryRow {
  user_id: string;
  full_name: string;
  email: string;
  last_access_at: string | null;
  sessions: number;
  actions: number;
  schools_viewed: number;
  searches: number;
}
