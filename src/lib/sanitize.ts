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
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'data-color'];

/** Only colour declarations survive on style; anything else is dropped. */
const SAFE_STYLE = /^(color|background-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)\s*;?\s*$/i;

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
    // it here to the two colour declarations the toolbar can emit.
    const style = node.getAttribute?.('style');
    if (style && !SAFE_STYLE.test(style.trim())) node.removeAttribute('style');
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
  });
}
