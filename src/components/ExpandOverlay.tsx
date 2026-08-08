import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A sub-screen at ~80% of the viewport, for content too large to read inside
 * the drawer — a faculty/major table being the case that prompted it.
 *
 * The close button sits at the **top left** by request, rather than the usual
 * top right.
 *
 * Note on Escape: in presentation mode the app is fullscreen, and browsers exit
 * fullscreen on Escape at the UA level, which we cannot intercept. So Escape
 * there will close this overlay *and* drop out of presentation. The X button is
 * the reliable close while presenting.
 */
export default function ExpandOverlay({ title, onClose, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Whatever had focus when we opened, so it can be handed back on close.
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    // The drawer behind is scrollable; freeze it so the wheel acts on the
    // overlay rather than the page underneath.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnTo.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="expand-backdrop" onClick={onClose}>
      <div
        className="expand-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // The backdrop closes on click; the panel must not pass its own
        // clicks up, or selecting text inside would dismiss the overlay.
        onClick={(e) => e.stopPropagation()}
      >
        <header className="expand-head">
          <button
            ref={closeRef}
            type="button"
            className="expand-close"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
          >
            ✕
          </button>
          <span className="expand-title">{title}</span>
        </header>
        <div className="expand-body">{children}</div>
      </div>
    </div>
  );
}
