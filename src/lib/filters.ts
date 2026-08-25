import type { University } from './types';

export interface UniversityFilters {
  q: string;
  region: string; // '' = all
  major: string; // '' = all
  type: string; // '' | 'public' | 'private'
  maxTuition: number | null; // million KRW per semester
  maxRanking: number | null;
  featuredOnly: boolean;
}

export const EMPTY_FILTERS: UniversityFilters = {
  q: '',
  region: '',
  major: '',
  type: '',
  maxTuition: null,
  maxRanking: null,
  featuredOnly: false,
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

/**
 * Fold text to a comparable key: lowercase, drop Vietnamese tone marks, đ → d.
 * NFD splits the tones off as combining marks, but đ/Đ carry none and have to be
 * replaced by hand. This is what lets staff type "quan tri" with no Vietnamese
 * keyboard and still hit "Quản trị".
 */
export function searchKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * How well a school's majors answer the query. 0 means no match (filtered out);
 * higher ranks first while the box has text in it.
 *
 * Every token has to land inside ONE major rather than being spread across
 * several: "y khoa luật" matching a school because it teaches Y khoa and Luật
 * separately would be noise, not an answer.
 */
export function scoreMajors(majors: string[], query: string): number {
  const q = searchKey(query);
  if (!q) return 0;
  const tokens = q.split(' ');
  let best = 0;
  for (const major of majors) {
    const key = searchKey(major);
    let score = 0;
    if (key === q) score = 4;                                  // the major itself
    else if (key.startsWith(q)) score = 3;                     // prefix
    else if (key.includes(q)) score = 2;                       // phrase inside it
    else if (tokens.every((t) => key.includes(t))) score = 1;  // words, any order
    if (score > best) best = score;
  }
  return best;
}

export function filterUniversities(
  universities: University[],
  f: UniversityFilters,
): University[] {
  // The box searches majors only — school names are browsed in the list.
  const q = f.q.trim();
  return universities.filter((u) => {
    if (q && scoreMajors(u.majors, q) === 0) return false;
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
    if (f.featuredOnly && !u.is_featured) return false;
    return true;
  });
}
