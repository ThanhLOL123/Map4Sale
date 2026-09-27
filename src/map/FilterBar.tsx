import { useMemo, useState } from 'react';
import { COUNTRIES, type CountryCode } from '../lib/countries';
import type { UniversityFilters } from '../lib/filters';
import { EMPTY_FILTERS } from '../lib/filters';
import type { University } from '../lib/types';

interface Props {
  /** Picks the tuition presets and their unit; everything else is data-driven. */
  country: CountryCode;
  universities: University[];
  filters: UniversityFilters;
  onChange: (f: UniversityFilters) => void;
  matchCount: number;
}

/** Count of non-search filters that differ from the empty defaults. */
function activeFilterCount(f: UniversityFilters): number {
  let n = 0;
  if (f.region) n++;
  if (f.major) n++;
  if (f.type) n++;
  if (f.maxTuition != null) n++;
  if (f.maxRanking != null) n++;
  if (f.featuredOnly) n++;
  return n;
}

export default function FilterBar({ country, universities, filters, onChange, matchCount }: Props) {
  // On mobile the selects live in a sheet toggled by this state; on desktop
  // CSS keeps the panel visible and hides the toggle button.
  const [open, setOpen] = useState(false);

  const regions = useMemo(
    () => [...new Set(universities.map((u) => u.region))].sort(),
    [universities],
  );
  const majors = useMemo(
    () => [...new Set(universities.flatMap((u) => u.majors))].sort((a, b) => a.localeCompare(b, 'vi')),
    [universities],
  );

  const set = (patch: Partial<UniversityFilters>) => onChange({ ...filters, ...patch });
  const activeCount = activeFilterCount(filters);
  const hasActiveFilter = Boolean(filters.q) || activeCount > 0;

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <input
          type="search"
          className="filter-search"
          placeholder="Tìm theo ngành học…"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
        <button
          type="button"
          className="btn filter-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
        <span className="filter-count">{matchCount} trường</span>
      </div>

      {open && <div className="filter-backdrop" onClick={() => setOpen(false)} aria-hidden />}

      <div className={`filter-panel${open ? ' open' : ''}`}>
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
          {COUNTRIES[country].tuition.presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
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
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.featuredOnly}
            onChange={(e) => set({ featuredOnly: e.target.checked })}
          />
          ★ Chỉ trường nổi bật
        </label>
        {hasActiveFilter && (
          <button type="button" className="btn btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            Xóa lọc
          </button>
        )}
        <button type="button" className="btn btn-primary filter-apply" onClick={() => setOpen(false)}>
          Xem {matchCount} trường
        </button>
      </div>
    </div>
  );
}
