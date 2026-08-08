import DOMPurify from 'dompurify';

/**
 * Sanitiser for the rich-text university fields (spec: admin-authored HTML,
 * read by every sale account).
 *
 * Sanitising happens on *render* rather than only on save. Admins write these
 * columns straight through the API — RLS permits it — so what is stored can
 * never be assumed to have passed through our editor. A stolen admin session
 * would otherwise be stored XSS against every user of the app.
 *
 * The allow-list deliberately mirrors the editor toolbar exactly. Anything the
 * toolbar cannot produce is not worth accepting: no img, iframe, script, style
 * or event handlers.
 */

const ALLOWED_TAGS = [
  'p', 'br',
  'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'a',
  'h2', 'h3',
  'span', 'mark',
  // Tables — only reachable from the Học phí editor, but the sanitiser is
  // shared, so any field could legitimately hold one after a copy-paste.
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'style', 'data-color',
  'colspan', 'rowspan', 'data-colwidth',
];

/**
 * Style declarations we keep. `width` is here because TipTap writes column
 * widths as `<col style="width: 120px">`; without it every table would collapse
 * to even columns on render.
 */
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color', 'width']);

/** Vectors that can smuggle a fetch or script out of a style value. */
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import/i;

/**
 * Filter a style attribute declaration by declaration.
 *
 * The previous version tested the whole attribute against one regex, so any
 * style with two declarations was dropped entirely — which would silently kill
 * a cell that carries both a colour and a width. Filtering per declaration
 * keeps what is safe and drops only the rest.
 */
function filterStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const colon = decl.indexOf(':');
      if (colon < 0) return false;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const value = decl.slice(colon + 1).trim();
      return ALLOWED_STYLE_PROPS.has(prop) && !!value && !UNSAFE_STYLE_VALUE.test(value);
    })
    .join('; ');
}

let hooked = false;

function installHooks() {
  if (hooked) return;
  hooked = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      // Links open away from the app, and rel blocks reverse-tabnabbing.
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    // DOMPurify allows the style attribute wholesale once permitted, so narrow
    // it here to the declarations the toolbar can actually emit.
    const style = node.getAttribute?.('style');
    if (style) {
      const safe = filterStyle(style);
      if (safe) node.setAttribute('style', safe);
      else node.removeAttribute('style');
    }
  });
}

/** True when the value contains at least one HTML tag. */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function sanitizeRichText(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // javascript:, data: and friends never reach an href.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    /**
     * Without this, merged table cells lose their spans.
     *
     * DOMPurify tests every attribute that is not on its URI-safe list against
     * ALLOWED_URI_REGEXP. Its default regexp has an escape hatch for values that
     * do not look like URIs at all; the tighter one above does not, so
     * `rowspan="3"` is judged an invalid URI and dropped. `style` survives only
     * because it is on DOMPurify's built-in URI-safe list — these are not.
     */
    ADD_URI_SAFE_ATTR: ['colspan', 'rowspan', 'data-colwidth'],
  });
}
