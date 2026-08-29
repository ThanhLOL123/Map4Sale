/**
 * The basemaps under the pins, and whether each one is configured.
 *
 * Satellite needs a Mapbox token, so — following the rule `src/lib/supabase.ts`
 * already sets for Supabase credentials — its absence is a supported state
 * rather than an error: with no token the app never offers the satellite
 * option and behaves exactly as it did before. Demo mode stays fully browsable
 * with no accounts of any kind. The street basemap needs no key at all.
 */

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

/** False when VITE_MAPBOX_TOKEN is unset; the satellite toggle is then hidden. */
export const satelliteAvailable = Boolean(mapboxToken);

export type Basemap = 'street' | 'satellite';

/** A raster tile pyramid — the classic `{z}/{x}/{y}.png` Leaflet layer. */
export interface BasemapSpec {
  url: string;
  attribution: string;
  maxZoom: number;
  /**
   * Both are required, never optional. react-leaflet forwards props straight
   * into Leaflet's options, and an explicit `undefined` *overwrites* Leaflet's
   * own default rather than falling back to it — a `tileSize: undefined` makes
   * Leaflet try to load an infinite number of tiles.
   */
  tileSize: number;
  zoomOffset: number;
}

/** A MapLibre vector style — tiles plus the rules for drawing them. */
export interface VectorBasemapSpec {
  styleUrl: string;
  attribution: string;
}

const KOSTAT_CREDIT = 'Ranh giới hành chính: <a href="https://kostat.go.kr">KOSTAT</a>';

const OSM_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The street basemap: OpenStreetMap data, CARTO's Positron look, Latin labels.
 *
 * OpenFreeMap serves the OpenMapTiles schema straight from OSM with no API key
 * and no rate limit, and its `positron` style is the CARTO design this map used
 * to fetch as flat images. Going vector is what buys the labels: the tiles
 * carry every name field, so `toLatinLabels()` can pick the Latin one before
 * MapLibre draws it (see `latinLabels.ts`). Korean labels were unreadable for
 * a Vietnamese sales team — that is the problem this basemap exists to solve.
 *
 * Point VITE_BASEMAP_STYLE_URL at any other MapLibre style to change the look
 * (OpenFreeMap also serves `liberty`, `bright`, `dark` and `fiord` at sibling
 * URLs). The Latin rewrite is applied to whatever comes back, and any style on
 * a schema without `name:latin` simply keeps its own labels.
 */
export const VECTOR_STREET: VectorBasemapSpec = {
  styleUrl:
    (import.meta.env.VITE_BASEMAP_STYLE_URL as string | undefined) ||
    'https://tiles.openfreemap.org/styles/positron',
  attribution:
    `${OSM_CREDIT} | <a href="https://openfreemap.org">OpenFreeMap</a> ` +
    '<a href="https://www.openmaptiles.org/">&copy; OpenMapTiles</a> ' +
    `| ${KOSTAT_CREDIT}`,
};

/**
 * Fallback for the street basemap, used when the vector style cannot be shown
 * — no WebGL in the browser, or the style host unreachable. These are CARTO's
 * pre-rendered images of roughly the same map, so the page still works; the
 * labels are just back to Korean. See `StreetBasemap.tsx`.
 */
export const RASTER_STREET: BasemapSpec = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution:
    `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a> | ${KOSTAT_CREDIT}`,
  maxZoom: 20,
  tileSize: 256,
  zoomOffset: 0,
};

/**
 * satellite-streets rather than plain satellite: bare imagery carries no road
 * or place names, which is disorienting next to the street basemap.
 *
 * tileSize and zoomOffset must be set together. Without them Leaflet requests
 * one zoom level too low and the imagery renders subtly soft — it reads as poor
 * imagery rather than a bug, which makes it easy to ship by accident.
 */
export const SATELLITE: BasemapSpec = {
  url:
    'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}' +
    `?access_token=${mapboxToken ?? ''}`,
  attribution:
    '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
    `${OSM_CREDIT} | ${KOSTAT_CREDIT}`,
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
};

/**
 * The map's own max zoom, set on <MapContainer> rather than left to the layers.
 *
 * Leaflet derives its zoom range from the tile layers on the map when the map
 * itself has no maxZoom — and the vector basemap is not a tile layer, so with
 * only that on the map the range would be unbounded. 19 is the lower of the two
 * raster ceilings (satellite's); MapLibre over-zooms its own tiles well past
 * it, so nothing is lost by holding every basemap to the same limit.
 */
export const MAX_ZOOM = 19;
