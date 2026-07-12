export type UniversityType = 'public' | 'private';

export interface University {
  id: string;
  name_kr: string;
  name_en: string;
  name_vi: string;
  logo_url: string | null;
  image_urls: string[];
  lat: number;
  lng: number;
  city: string;
  region: string;
  type: UniversityType;
  ranking: number | null;
  majors: string[];
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

export interface LoginLog {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string;
  city: string;
  region: string;
  country: string;
  browser: string;
  profiles?: Pick<Profile, 'email' | 'full_name'> | null;
}
