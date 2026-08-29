/**
 * Rewrites a MapLibre style so every place label renders in Latin script.
 *
 * Raster basemaps (the CARTO tiles this replaced) bake their labels into the
 * image: Seoul arrives as 서울, and no amount of client-side work can change
 * that. Vector tiles ship the *data* instead, so the label text is ours to
 * choose — which is the whole reason the street basemap moved to MapLibre.
 *
 * OpenMapTiles-schema tiles (what OpenFreeMap serves) carry several name
 * fields per feature. `name:latin` is the one designed for this: it holds the
 * feature's Latin-script name where OSM has one and a transliteration where it
 * does not, so coverage is effectively complete. The others are fallbacks for
 * tile sources built on a different schema — and plain `name` last, so an
 * unexpected source degrades to native labels rather than to a blank map.
 */

/** A style object as fetched. Kept loose on purpose — see `toLatinLabels`. */
type StyleLike = { layers?: unknown[] } & Record<string, unknown>;

type SymbolLayerLike = {
  type?: unknown;
  layout?: Record<string, unknown>;
} & Record<string, unknown>;

/**
 * The replacement `text-field`. `coalesce` skips a missing property (`get`
 * yields null), so this is "first of these the feature actually has".
 */
export const LATIN_NAME_FIELD = [
  'coalesce',
  ['get', 'name:latin'],
  ['get', 'name:en'],
  ['get', 'name_int'],
  ['get', 'name'],
];

/**
 * True when a `text-field` renders a place name, in any of the forms styles
 * use: the token string `"{name:latin}\n{name:nonlatin}"`, the expression
 * `["get", "name"]`, or a `format`/`concat` wrapping either.
 *
 * The guard matters because `text-field` is not only used for names — house
 * numbers (`housenumber`) and road shields (`ref`) are symbol layers too, and
 * rewriting those to a name would erase them.
 */
function rendersAName(textField: unknown): boolean {
  // `name`, optionally suffixed (`name:latin`, `name_int`) but never as the
  // tail of a longer word, which is what keeps `housenumber` and `surname` out.
  return /(?:^|[^A-Za-z0-9_])name(?![A-Za-z0-9])/.test(JSON.stringify(textField) ?? '');
}

/**
 * Returns a copy of `style` with the labels forced to Latin script.
 *
 * The input is whatever the style URL served, so it is typed loosely and
 * validated by shape rather than trusted: a style that is missing `layers`, or
 * whose layers are not objects, is passed through untouched instead of
 * throwing. A basemap with native labels beats no basemap at all.
 */
export function toLatinLabels<T>(style: T): T {
  const source = style as StyleLike | null;
  if (!source || !Array.isArray(source.layers)) return style;

  const layers = source.layers.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const layer = entry as SymbolLayerLike;
    if (layer.type !== 'symbol') return entry;

    const layout = layer.layout;
    if (!layout || typeof layout !== 'object') return entry;
    if (!('text-field' in layout) || !rendersAName(layout['text-field'])) return entry;

    return { ...layer, layout: { ...layout, 'text-field': LATIN_NAME_FIELD } };
  });

  return { ...source, layers } as T;
}
