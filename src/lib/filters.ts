import type { University } from './types';

export interface UniversityFilters {
  q: string;
  region: string; // '' = all
  major: string; // '' = all
  type: string; // '' | 'public' | 'private'
  maxTuition: number | null; // million KRW per semester
  maxRanking: number | null;
}

export const EMPTY_FILTERS: UniversityFilters = {
  q: '',
  region: '',
  major: '',
  type: '',
  maxTuition: null,
  maxRanking: null,
};

/**
 * Tuition is stored as human-readable text whose first number is the lowest
 * tuition in million KRW per semester (see sample data). Extract it for the
 * "max tuition" filter; records without a leading number are never excluded.
 */
export function parseTuitionMillions(tuition: string): number | null {
  const m = tuition.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

export function filterUniversities(
  universities: University[],
  f: UniversityFilters,
): University[] {
  const q = f.q.trim().toLowerCase();
  return universities.filter((u) => {
    if (q) {
      const haystack = `${u.name_vi} ${u.name_en} ${u.name_kr} ${u.city}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.region && u.region !== f.region) return false;
    if (f.major && !u.majors.includes(f.major)) return false;
    if (f.type && u.type !== f.type) return false;
    if (f.maxTuition != null) {
      const t = parseTuitionMillions(u.tuition);
      if (t != null && t > f.maxTuition) return false;
    }
    if (f.maxRanking != null && (u.ranking == null || u.ranking > f.maxRanking)) {
      return false;
    }
    return true;
  });
}
