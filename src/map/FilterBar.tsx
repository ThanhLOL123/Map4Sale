import { useMemo } from 'react';
import type { UniversityFilters } from '../lib/filters';
import { EMPTY_FILTERS } from '../lib/filters';
import type { University } from '../lib/types';

interface Props {
  universities: University[];
  filters: UniversityFilters;
  onChange: (f: UniversityFilters) => void;
  matchCount: number;
}

export default function FilterBar({ universities, filters, onChange, matchCount }: Props) {
  const regions = useMemo(
    () => [...new Set(universities.map((u) => u.region))].sort(),
    [universities],
  );
  const majors = useMemo(
    () => [...new Set(universities.flatMap((u) => u.majors))].sort((a, b) => a.localeCompare(b, 'vi')),
    [universities],
  );

  const set = (patch: Partial<UniversityFilters>) => onChange({ ...filters, ...patch });
  const hasActiveFilter =
    filters.q || filters.region || filters.major || filters.type ||
    filters.maxTuition != null || filters.maxRanking != null;

  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search"
        placeholder="Tìm trường (tên, thành phố)…"
        value={filters.q}
        onChange={(e) => set({ q: e.target.value })}
      />
      <select value={filters.region} onChange={(e) => set({ region: e.target.value })}>
        <option value="">Khu vực: tất cả</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <select value={filters.major} onChange={(e) => set({ major: e.target.value })}>
        <option value="">Ngành: tất cả</option>
        {majors.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select value={filters.type} onChange={(e) => set({ type: e.target.value })}>
        <option value="">Loại: tất cả</option>
        <option value="public">Công lập</option>
        <option value="private">Tư thục</option>
      </select>
      <select
        value={filters.maxTuition ?? ''}
        onChange={(e) => set({ maxTuition: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">Học phí: tất cả</option>
        <option value="2.5">≤ 2.5 triệu KRW/kỳ</option>
        <option value="4">≤ 4 triệu KRW/kỳ</option>
        <option value="5">≤ 5 triệu KRW/kỳ</option>
        <option value="6">≤ 6 triệu KRW/kỳ</option>
      </select>
      <select
        value={filters.maxRanking ?? ''}
        onChange={(e) => set({ maxRanking: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">Xếp hạng: tất cả</option>
        <option value="5">Top 5</option>
        <option value="10">Top 10</option>
        <option value="20">Top 20</option>
        <option value="50">Top 50</option>
      </select>
      <span className="filter-count">{matchCount} trường</span>
      {hasActiveFilter && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Xóa lọc
        </button>
      )}
    </div>
  );
}
