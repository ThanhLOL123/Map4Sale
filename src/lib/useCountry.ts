import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isCountryCode, type CountryCode } from './countries';

const PARAM = 'country';
const STORAGE_KEY = 'map4sale:country';

function remembered(): CountryCode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isCountryCode(v) ? v : null;
  } catch {
    return null; // storage blocked (private mode, site-data policy)
  }
}

/**
 * Which country the map is showing.
 *
 * The URL is the source of truth (`/?country=tw`), so a reload or a shared link
 * keeps the country and the browser's Back button undoes a switch. With no
 * parameter the last choice is restored, then Korea — which keeps every
 * pre-Taiwan link, bookmark and habit landing exactly where it used to.
 *
 * Any component can call this; they all read the same URL, so the header's
 * switch and the map stay in step without passing state down.
 */
export function useCountry(): [CountryCode, (next: CountryCode) => void] {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get(PARAM);
  const country: CountryCode = isCountryCode(fromUrl) ? fromUrl : (remembered() ?? 'kr');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, country);
    } catch {
      // Not persisting the choice is harmless; the URL still carries it.
    }
  }, [country]);

  // Write a remembered/default country into the URL, replacing the entry. Left
  // implicit, Back after a switch would land on a bare `/`, which resolves
  // through localStorage to the country just switched *to* — so Back would
  // appear to do nothing. Idempotent, so every caller of this hook may run it.
  useEffect(() => {
    if (fromUrl === country) return;
    setParams(
      (prev) => {
        const copy = new URLSearchParams(prev);
        copy.set(PARAM, country);
        return copy;
      },
      { replace: true },
    );
  }, [fromUrl, country, setParams]);

  // Pushes a history entry (no `replace`), so Back returns to the other country.
  const setCountry = useCallback(
    (next: CountryCode) => {
      setParams((prev) => {
        const copy = new URLSearchParams(prev);
        copy.set(PARAM, next);
        return copy;
      });
    },
    [setParams],
  );

  return [country, setCountry];
}
