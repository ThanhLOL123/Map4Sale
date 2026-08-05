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
 * Tuition is rich text since the field gained an editor, so the markup has to
 * come off before we look for a number. Attributes are full of digits that
 * would otherwise win: `<h2>` reads as 2, `style="color:#dc2626"` as 2626, and
 * an `&#8211;` en-dash entity as 8211.
 *
 * This is a parser, not a security boundary — sanitising for display is
 * DOMPurify's job in `src/lib/sanitize.ts`. Values written before the editor
 * existed carry no tags, so for them this is a no-op.
 */
function toPlainText(value: string): string {
  return value
    // Header cells go first, contents and all. Now that Học phí can hold a
    // table, headers are where labels like "Năm 2026" or "Học kỳ 1" live, and
    // any of those would otherwise be read as the price. The figure itself
    // belongs in a normal cell.
    .replace(/<th\b[^>]*>[\s\S]*?<\/th>/gi, ' ')
    .replace(/<[^>]*>/g, ' ') // remaining tags, and with them every attribute
    .replace(/&[#\w]+;/g, ' '); // entities, including numeric ones
}

/**
 * Tuition is human-readable text whose first number is the lowest tuition in
 * million KRW per semester (see sample data). Extract it for the "max tuition"
 * filter and the tuition sort in SideList; records without a number are never
 * excluded, and sort last.
 */
export function parseTuitionMillions(tuition: string): number | null {
  const m = toPlainText(tuition).match(/(\d+(?:[.,]\d+)?)/);
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
