import { useEffect, useMemo, useRef } from 'react';
import { parseTuitionMillions } from '../lib/filters';
import type { University } from '../lib/types';

export type SortKey = 'ranking' | 'name' | 'tuition';

function sortUniversities(list: University[], key: SortKey): University[] {
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
}

/** Docked, scrollable compact-rows list beside the map. */
export default function SideList({ universities, selected, onSelect, sort, onSortChange }: Props) {
  const rows = useMemo(() => sortUniversities(universities, sort), [universities, sort]);
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
                className={`uni-row${selected?.id === u.id ? ' uni-row-active' : ''}`}
                onClick={() => onSelect(u)}
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
                  <span className="badge">{u.city}</span>
                  <span className={`badge badge-${u.type}`}>
                    {u.type === 'public' ? 'Công lập' : 'Tư thục'}
                  </span>
                  {u.ranking != null && <span className="badge badge-rank">#{u.ranking}</span>}
                  {u.is_featured && (
                    <span className="badge badge-featured" title="Nổi bật">
                      ★
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="uni-list-empty muted">Không có trường nào khớp bộ lọc.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
