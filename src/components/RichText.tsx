import { useEffect, useMemo, useRef, useState } from 'react';
import { looksLikeHtml, sanitizeRichText } from '../lib/sanitize';
import ExpandOverlay from './ExpandOverlay';

interface Props {
  value: string;
  /** Rendered when the field is empty, matching the old `{value || '—'}`. */
  placeholder?: string;
  className?: string;
  /**
   * Clamp tall content and offer a button that opens it in a sub-screen.
   * Used for the faculty/major table, which is far taller than the drawer.
   */
  expandable?: boolean;
  /** Heading for the overlay; only read when `expandable`. */
  title?: string;
}

/**
 * Renders one of the rich-text university fields.
 *
 * Values written before the editor existed are plain text, and some of them
 * legitimately contain characters that mean something in HTML — "học phí < 5
 * triệu" being the obvious case. Feeding those through innerHTML would let the
 * parser eat from the `<` onwards, so anything without a tag is handed to React
 * instead and escaped normally. Only genuine editor output takes the HTML path,
 * and only after sanitising.
 */
export default function RichText({
  value,
  placeholder = '—',
  className,
  expandable = false,
  title = 'Chi tiết',
}: Props) {
  const trimmed = value?.trim() ?? '';

  const html = useMemo(
    () => (trimmed && looksLikeHtml(trimmed) ? sanitizeRichText(trimmed) : null),
    [trimmed],
  );

  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  // Re-measure through a ResizeObserver rather than once on mount: the drawer
  // more than doubles in width when presentation mode toggles, so a one-shot
  // measurement would go stale exactly when it matters most.
  useEffect(() => {
    const el = bodyRef.current;
    if (!expandable || !el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expandable, html, trimmed]);

  if (!trimmed) return <p className={className}>{placeholder}</p>;

  const classes = (extra = '') =>
    ['rich-text', html === null ? 'rich-text-plain' : '', extra, className]
      .filter(Boolean)
      .join(' ');

  // Legacy plain text keeps `pre-line` so the author's line breaks survive.
  const body = (extra?: string) =>
    html === null ? (
      <p className={classes(extra)}>{trimmed}</p>
    ) : (
      <div className={classes(extra)} dangerouslySetInnerHTML={{ __html: html }} />
    );

  if (!expandable) return body();

  return (
    <>
      {/* The clamp cuts tall content off cleanly; `overflowing` drives the
          button below, which is what tells the reader there is more. */}
      <div className="rich-text-clamp" ref={bodyRef}>
        {body()}
      </div>
      {overflowing && (
        <button type="button" className="rich-text-expand" onClick={() => setOpen(true)}>
          ⤢ Xem toàn bộ
        </button>
      )}
      {open && (
        <ExpandOverlay title={title} onClose={() => setOpen(false)}>
          {body('rich-text-full')}
        </ExpandOverlay>
      )}
    </>
  );
}
