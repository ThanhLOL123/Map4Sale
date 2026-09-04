import { useEffect, useMemo, useRef } from 'react';
import { parseTuitionMillions, scoreMajors } from '../lib/filters';
import type { University } from '../lib/types';

export type SortKey = 'ranking' | 'name' | 'tuition';

function sortUniversities(list: University[], key: SortKey, query: string): University[] {
  const copy = [...list];
  switch (key) {
    case 'name':
      copy.sort((a, b) => a.name_vi.localeCompare(b.name_vi, 'vi'));
      break;
    case 'tuition':
      copy.sort((a, b) => {
        const ta = parseTuitionMillions(a.tuition);
        const tb = parseTuitionMillions(b.tuition);
        return (ta ?? Infinity) - (tb ?? Infinity); // unparseable tuition sorts last
      });
      break;
    case 'ranking':
    default:
      copy.sort((a, b) => (a.ranking ?? Infinity) - (b.ranking ?? Infinity));
  }
  // While the box has text in it, the best answer to what was typed leads and
  // the chosen sort only breaks ties. Relevance is not an option in the Sắp xếp
  // dropdown because it is not a preference — it is what order means mid-search.
  if (query.trim()) {
    const score = new Map(copy.map((u) => [u.id, scoreMajors(u.majors, query)]));
    copy.sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
  }

  // "Nổi bật" schools lead whichever sort is active; the chosen order still
  // holds inside each group (Array.prototype.sort is stable).
  return [...copy.filter((u) => u.is_featured), ...copy.filter((u) => !u.is_featured)];
}

interface Props {
  universities: University[]; // already filtered
  selected: University | null;
  onSelect: (u: University) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  /** Live search text; when set, rows are ordered by how well they match it. */
  query: string;
  loading: boolean;
  /** Schools before filtering — tells "database is empty" from "nothing matched". */
  totalCount: number;
  hoveredId: string | null;
  onHover: (u: University | null) => void;
  onClearFilters: () => void;
}

/** Docked, scrollable compact-rows list beside the map. */
export default function SideList({
  universities,
  selected,
  onSelect,
  sort,
  onSortChange,
  query,
  loading,
  totalCount,
  hoveredId,
  onHover,
  onClearFilters,
}: Props) {
  const rows = useMemo(
    () => sortUniversities(universities, sort, query),
    [universities, sort, query],
  );
  const activeRow = useRef<HTMLButtonElement>(null);

  // Picking a school on the map should reveal its row here too.
  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [selected?.id]);

  return (
    <div className="side-list">
      <div className="list-toolbar">
        <span className="muted">{rows.length} trường</span>
        <label className="sort-control">
          Sắp xếp
          <select value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
            <option value="ranking">Xếp hạng</option>
            <option value="name">Tên (A–Z)</option>
            <option value="tuition">Học phí (thấp → cao)</option>
          </select>
        </label>
      </div>

      <div className="list-scroll">
        <ul className="uni-list">
          {rows.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                ref={selected?.id === u.id ? activeRow : null}
                className={
                  `uni-row${selected?.id === u.id ? ' uni-row-active' : ''}` +
                  `${hoveredId === u.id ? ' uni-row-hover' : ''}`
                }
                onClick={() => onSelect(u)}
                // Focus mirrors hover so keyboard users get the same pin highlight.
                onMouseEnter={() => onHover(u)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(u)}
                onBlur={() => onHover(null)}
              >
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
                  {u.is_featured && (
                    <span className="badge badge-featured" title="Nổi bật">
                      ★
                    </span>
                  )}
                  <span className="badge">{u.city}</span>
                  <span className={`badge badge-${u.type}`}>
                    {u.type === 'public' ? 'Công lập' : 'Tư thục'}
                  </span>
                  {u.ranking != null && <span className="badge badge-rank">#{u.ranking}</span>}
                </span>
              </button>
            </li>
          ))}
          {/* This panel is the only place these states are reported — there is
              deliberately nothing floating over the middle of the map. */}
          {rows.length === 0 && (
            <li className="uni-list-empty muted">
              {loading ? (
                <>
                  <span className="map-spinner" aria-hidden /> Đang tải dữ liệu trường…
                </>
              ) : totalCount === 0 ? (
                'Chưa có trường nào trong hệ thống.'
              ) : (
                <>
                  {query.trim()
                    ? `Không có ngành nào khớp “${query.trim()}”.`
                    : 'Không có trường nào khớp bộ lọc.'}
                  <button type="button" className="btn btn-ghost" onClick={onClearFilters}>
                    Xóa lọc
                  </button>
                </>
              )}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
