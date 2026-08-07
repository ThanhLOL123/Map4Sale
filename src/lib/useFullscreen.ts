import { useCallback, useEffect, useState } from 'react';

/**
 * Browser fullscreen, kept honest.
 *
 * The state is driven by the `fullscreenchange` event rather than by our own
 * calls, because the user can leave fullscreen with Escape or F11 without ever
 * touching our button. Tracking our own intent instead would leave the app
 * styled for a projector inside a normal window.
 *
 * `requestFullscreen()` also rejects when the browser declines — it requires a
 * user gesture, and some setups refuse outright — so callers get a boolean back
 * and can decide what to do. Presentation mode still applies its styling either
 * way; losing the browser chrome is a bonus, not a requirement.
 */
export function useFullscreen(): {
  active: boolean;
  request: () => Promise<boolean>;
  exit: () => Promise<void>;
} {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const request = useCallback(async () => {
    if (document.fullscreenElement) return true;
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false; // declined; the caller carries on without it
    }
  }, []);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* already out, or the browser refused — the event listener is the truth */
    }
  }, []);

  return { active, request, exit };
}
