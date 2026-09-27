/**
 * The two basemaps the map can show, and whether satellite is configured.
 *
 * Satellite needs a Mapbox token, so — following the rule `src/lib/supabase.ts`
 * already sets for Supabase credentials — its absence is a supported state
 * rather than an error: with no token the app never offers the satellite
 * option and behaves exactly as it did before. Demo mode stays fully browsable
 * with no accounts of any kind.
 */

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

/**
 * CARTO began requiring a key for their basemaps: without one every tile comes
 * back stamped "API KEY REQUIRED". The key is free (fair use, 5M tiles/month)
 * from https://carto.com/basemaps/apikey and needs no CARTO account.
 *
 * Optional like the Mapbox token — with no key the map still works, it just
 * carries CARTO's watermark, which is better than falling back to stock OSM
 * raster: that renders Korean place names in Hangul, and the staff reading this
 * map are Vietnamese.
 */
const cartoKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined;

/** False when VITE_MAPBOX_TOKEN is unset; the satellite toggle is then hidden. */
export const satelliteAvailable = Boolean(mapboxToken);

export type Basemap = 'street' | 'satellite';

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

// The boundary credit (KOSTAT, or the Taiwan source) is not here: it rides on
// the country's GeoJSON layer (see countryMaps.ts), so these stay country-free.

const STREET: BasemapSpec = {
  url:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' +
    (cartoKey ? `?key=${cartoKey}` : ''),
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
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
const SATELLITE: BasemapSpec = {
  url:
    'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}' +
    `?access_token=${mapboxToken ?? ''}`,
  attribution:
    '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
};

export const BASEMAPS: Record<Basemap, BasemapSpec> = {
  street: STREET,
  satellite: SATELLITE,
};
