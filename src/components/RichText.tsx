import { useMemo } from 'react';
import { looksLikeHtml, sanitizeRichText } from '../lib/sanitize';

interface Props {
  value: string;
  /** Rendered when the field is empty, matching the old `{value || '—'}`. */
  placeholder?: string;
  className?: string;
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
export default function RichText({ value, placeholder = '—', className }: Props) {
  const trimmed = value?.trim() ?? '';

  const html = useMemo(
    () => (trimmed && looksLikeHtml(trimmed) ? sanitizeRichText(trimmed) : null),
    [trimmed],
  );

  if (!trimmed) return <p className={className}>{placeholder}</p>;

  if (html === null) {
    // Legacy plain text: `pre-line` keeps the line breaks the author typed,
    // which the old single-<p> rendering used to collapse.
    return <p className={`rich-text rich-text-plain${className ? ` ${className}` : ''}`}>{trimmed}</p>;
  }

  return (
    <div
      className={`rich-text${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
