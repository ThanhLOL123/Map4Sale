import { useEffect, useMemo, useState } from 'react';
import { fetchUniversities } from './api';
import { EMPTY_FILTERS, filterUniversities, type UniversityFilters } from './filters';
import type { University } from './types';

/**
 * Shared data layer for the map and list views: loads universities once and
 * exposes the live filter + selection state so both screens behave identically.
 */
export function useUniversityBrowser() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UniversityFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<University | null>(null);

  useEffect(() => {
    fetchUniversities()
      .then(setUniversities)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'));
  }, []);

  const filtered = useMemo(
    () => filterUniversities(universities, filters),
    [universities, filters],
  );

  return { universities, filtered, error, filters, setFilters, selected, setSelected };
}
