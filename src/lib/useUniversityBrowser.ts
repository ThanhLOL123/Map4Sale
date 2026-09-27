import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from './activity';
import { fetchUniversities } from './api';
import { EMPTY_FILTERS, filterUniversities, type UniversityFilters } from './filters';
import type { CountryCode, University } from './types';

/** The search box fires per keystroke; only a settled query is worth a row. */
const SEARCH_DEBOUNCE_MS = 1200;
const MIN_SEARCH_LENGTH = 2;

/**
 * Shared data layer for the map and list views: loads universities once and
 * exposes the live filter + selection state so both screens behave identically.
 *
 * It is also the single funnel for activity tracking (spec: see
 * supabase/migrations/0006_activity_tracking.sql). Both setters are handed to
 * the UI raw, so wrapping them here instruments every call site — map pins,
 * list rows, the filter bar — without touching a single component.
 *
 * `country` narrows everything to one map. Schools are still fetched once for
 * both countries; `universities` is the chosen country's share, so the filter
 * bar's options, the list, its counts and the tracked result counts all become
 * per-country without any of them knowing countries exist.
 */
export function useUniversityBrowser(country: CountryCode) {
  const [allUniversities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UniversityFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<University | null>(null);

  useEffect(() => {
    fetchUniversities()
      .then(setUniversities)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'))
      .finally(() => setLoading(false));
  }, []);

  const universities = useMemo(
    () => allUniversities.filter((u) => u.country === country),
    [allUniversities, country],
  );

  const filtered = useMemo(
    () => filterUniversities(universities, filters),
    [universities, filters],
  );

  // Keyed on the id rather than fired from DetailDrawer's mount: the drawer is a
  // hookless component that React reuses when switching school A → B, so it only
  // ever mounts on the null → selected transition.
  useEffect(() => {
    if (!selected) return;
    trackEvent('school_view', { universityId: selected.id, detail: selected.name_vi });
  }, [selected?.id]);

  const universitiesRef = useRef(universities);
  universitiesRef.current = universities;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef('');

  // Compared against a ref rather than inside a setFilters(prev => …) updater:
  // updaters must stay pure, and StrictMode invokes them twice in development,
  // which would record every filter change as two events.
  const filtersRef = useRef(filters);

  const trackedSetFilters = useCallback((next: UniversityFilters) => {
    const prev = filtersRef.current;
    filtersRef.current = next;
    const changed = (Object.keys(next) as Array<keyof UniversityFilters>).filter(
      (k) => next[k] !== prev[k],
    );

    const others = changed.filter((k) => k !== 'q');
    if (others.length > 0) {
      // Selects and checkboxes fire once per interaction, so no debounce. A
      // reset clears everything at once and reads better as a single event.
      const detail =
        others.length > 1 ? 'reset' : `${others[0]}=${String(next[others[0]])}`;
      trackEvent('filter', {
        detail,
        resultCount: filterUniversities(universitiesRef.current, next).length,
      });
    }

    if (changed.includes('q')) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      const q = next.q.trim();
      searchTimer.current = setTimeout(() => {
        searchTimer.current = null;
        // Length guard drops "s"/"se" on the way to a real word; the equality
        // guard stops backspacing into a query we already recorded.
        if (q.length < MIN_SEARCH_LENGTH || q === lastQuery.current) return;
        lastQuery.current = q;
        trackEvent('search', {
          detail: q,
          resultCount: filterUniversities(universitiesRef.current, next).length,
        });
      }, SEARCH_DEBOUNCE_MS);
    }

    setFilters(next);
  }, []);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  // A switch of country starts the new map clean: a Korean region filter or an
  // open Korean profile means nothing on the Taiwan map. Filters are reset
  // directly rather than through trackedSetFilters so the switch is recorded
  // as one `country=…` event instead of also logging a `reset`.
  const shownCountry = useRef(country);
  useEffect(() => {
    if (shownCountry.current === country) return; // first render, or no change
    shownCountry.current = country;

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    lastQuery.current = '';
    filtersRef.current = EMPTY_FILTERS;
    setFilters(EMPTY_FILTERS);
    setSelected(null);

    // `filter` is an existing event type, so this needs no schema change; it
    // tells managers which market each person was browsing.
    trackEvent('filter', {
      detail: `country=${country}`,
      // Already the new country's schools: the ref is refreshed during render.
      resultCount: universitiesRef.current.length,
    });
  }, [country]);

  return {
    universities,
    filtered,
    loading,
    error,
    filters,
    setFilters: trackedSetFilters,
    selected,
    setSelected,
  };
}
