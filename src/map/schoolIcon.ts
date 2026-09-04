import L from 'leaflet';
import type { University } from '../lib/types';

/**
 * Naver-Map-style markers: a round logo head on a pointed tail, with the school
 * name rendered inside the same divIcon (rather than as a Leaflet Tooltip) so
 * the label can never drift away from its pin and stays in the pin's own
 * stacking context.
 */

const PIN_WIDTH = 36;
const PIN_HEIGHT = 46;

/** School data lands in an HTML string, so escape it (admin-entered free text). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function headHtml(u: University): string {
  if (u.logo_url) {
    // draggable="false" is load-bearing: an <img> is natively draggable, so
    // pressing a pin and moving even a couple of pixels — a trackpad or a
    // touchscreen almost guarantees it — starts an image drag and the browser
    // never fires the click. The pin then looks simply dead.
    return `<img class="school-pin-logo" src="${escapeHtml(u.logo_url)}" alt="" draggable="false">`;
  }
  const initial = escapeHtml(u.name_en.slice(0, 1) || u.name_vi.slice(0, 1));
  return `<span class="school-pin-logo school-pin-logo-placeholder">${initial}</span>`;
}

/**
 * Build the marker for one school. `selected` swaps in the enlarged accent
 * variant, `hovered` the lighter ring used while the pointer is over that
 * school's row in the list — callers must memoize per (university, selected,
 * hovered) so react-leaflet only calls `setIcon()` when the state changes.
 */
export function createSchoolIcon(
  u: University,
  selected: boolean,
  hovered = false,
): L.DivIcon {
  const className = [
    'school-pin',
    `school-pin-${u.type}`,
    selected ? 'school-pin-selected' : '',
    hovered && !selected ? 'school-pin-hover' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return L.divIcon({
    className,
    html:
      `<span class="school-pin-head">${headHtml(u)}</span>` +
      `<span class="school-pin-label">${escapeHtml(u.name_vi)}</span>`,
    iconSize: [PIN_WIDTH, PIN_HEIGHT],
    iconAnchor: [PIN_WIDTH / 2, PIN_HEIGHT], // tail tip sits on the coordinate
  });
}

/**
 * Cluster bubble. Typed structurally: `@types/leaflet.markercluster` is not a
 * dependency, so we only rely on the one method we actually call.
 */
export function createClusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const count = cluster.getChildCount();
  const tier = count < 10 ? 'sm' : count < 25 ? 'md' : 'lg';
  const size = tier === 'sm' ? 38 : tier === 'md' ? 46 : 54;

  return L.divIcon({
    className: `school-cluster school-cluster-${tier}`,
    html: `<span>${count}</span>`,
    iconSize: L.point(size, size, true),
  });
}
