import { useMemo, useState } from 'react';
import AppHeader from '../components/AppHeader';
import DetailDrawer from '../map/DetailDrawer';
import FilterBar from '../map/FilterBar';
import { parseTuitionMillions } from '../lib/filters';
import { useUniversityBrowser } from '../lib/useUniversityBrowser';
import type { University } from '../lib/types';

type SortKey = 'ranking' | 'name' | 'tuition';

function sortUniversities(list: University[], key: SortKey): University[] {
  const copy = [...list];
  switch (key) {
    case 'name':
      return copy.sort((a, b) => a.name_vi.localeCompare(b.name_vi, 'vi'));
    case 'tuition':
      return copy.sort((a, b) => {
        const ta = parseTuitionMillions(a.tuition);
        const tb = parseTuitionMillions(b.tuition);
        // Records without a parseable tuition sort last.
        return (ta ?? Infinity) - (tb ?? Infinity);
      });
    case 'ranking':
    default:
      // Unranked schools sort last.
      return copy.sort((a, b) => (a.ranking ?? Infinity) - (b.ranking ?? Infinity));
  }
}

export default function UniversityListView() {
  const { universities, filtered, error, filters, setFilters, selected, setSelected } =
    useUniversityBrowser();
  const [sort, setSort] = useState<SortKey>('ranking');

  const rows = useMemo(() => sortUniversities(filtered, sort), [filtered, sort]);

  return (
    <div className="list-page">
      <AppHeader />

      <FilterBar
        universities={universities}
        filters={filters}
        onChange={setFilters}
        matchCount={filtered.length}
      />

      <div className="list-toolbar">
        <span className="muted">{rows.length} trường</span>
        <label className="sort-control">
          Sắp xếp
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="ranking">Xếp hạng</option>
            <option value="name">Tên (A–Z)</option>
            <option value="tuition">Học phí (thấp → cao)</option>
          </select>
        </label>
      </div>

      {error && <p className="form-error map-error">{error}</p>}

      <div className="list-scroll">
        <ul className="uni-list">
          {rows.map((u) => (
            <li key={u.id}>
              <button type="button" className="uni-row" onClick={() => setSelected(u)}>
                {u.logo_url ? (
                  <img src={u.logo_url} alt="" className="uni-row-logo" />
                ) : (
                  <span className="uni-row-logo uni-row-logo-placeholder" aria-hidden>
                    {u.name_en.slice(0, 1)}
                  </span>
                )}
                <span className="uni-row-main">
                  <span className="uni-row-name">{u.name_vi}</span>
                  <span className="uni-row-sub">{u.name_en}</span>
                </span>
                <span className="uni-row-meta">
                  <span className="badge">{u.city}</span>
                  <span className={`badge badge-${u.type}`}>
                    {u.type === 'public' ? 'Công lập' : 'Tư thục'}
                  </span>
                  {u.ranking != null && <span className="badge badge-rank">#{u.ranking}</span>}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && !error && (
            <li className="uni-list-empty muted">Không có trường nào khớp bộ lọc.</li>
          )}
        </ul>
      </div>

      {selected && <DetailDrawer university={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
