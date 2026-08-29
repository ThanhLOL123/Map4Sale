import { useEffect, useState } from 'react';
import type { Layer } from 'leaflet';
// Type-only, never a value import: MapLibre must stay out of the entry chunk
// that the lazy import further down keeps it out of.
import type { MapLibreMap, MapOptions } from 'maplibre-gl';
import { TileLayer, useMap } from 'react-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RASTER_STREET, VECTOR_STREET } from './basemaps';
import { toLatinLabels } from './latinLabels';

/**
 * The street basemap: OpenStreetMap vector tiles drawn by MapLibre, with every
 * label forced to Latin script (see `latinLabels.ts`).
 *
 * In the happy path this component renders nothing. MapLibre draws onto its own
 * canvas, which the maplibre-gl-leaflet bridge parks in Leaflet's `tilePane`.
 * That pane placement is load-bearing: it is what keeps the basemap under the
 * province polygons and the pins, and what lets the existing
 * `.provinces-solo .leaflet-tile-pane` rule in app.css cross-fade the basemap
 * out for the vector province view without knowing it is no longer tiles.
 *
 * If the vector basemap cannot be shown the component falls back to CARTO's
 * raster tiles rather than leaving the map blank. Both known causes are
 * properties of the visitor's machine or network rather than bugs: no WebGL
 * (old device, GPU blocklisted, hardware acceleration off), or the style host
 * unreachable. The labels revert to Korean, which is the very thing this
 * basemap set out to fix — but a working map in the wrong script beats an empty
 * one.
 */

/** A style that has not answered by now is treated as unreachable. */
const STYLE_TIMEOUT_MS = 8000;

/**
 * How long MapLibre gets to draw the first frame before we give up on it.
 *
 * A style can load while the *tiles* it points at cannot — a firewall that
 * allows one host and not another, an ad blocker, a proxy that mangles the
 * worker's requests. MapLibre reports none of that as a failure: it simply
 * never fires `load`, and the map sits on its background colour indefinitely.
 * Blank is the one outcome worth avoiding, so a basemap that has not drawn by
 * now is swapped for the raster fallback. Generous on purpose — this must not
 * fire on a merely slow connection.
 */
const GL_LOAD_TIMEOUT_MS = 15000;

/**
 * The fetched-and-rewritten style, kept for the life of the page.
 *
 * The basemap mounts more often than it looks: React's StrictMode runs every
 * effect twice in development, the admin form rebuilds its picker whenever the
 * university changes, and coming back from satellite starts a fresh layer. Each
 * of those would otherwise re-download a style document that cannot have
 * changed. A rejected request is dropped rather than cached, so a basemap that
 * failed on a flaky connection can still come back on the next mount.
 */
type MapStyle = NonNullable<MapOptions['style']>;

let styleRequest: Promise<MapStyle> | null = null;

function loadStyle(): Promise<MapStyle> {
  if (styleRequest) return styleRequest;

  // The request owns its own abort signal rather than borrowing one from
  // whichever component asked first: the answer is shared, so one unmounting
  // caller must not cancel it out from under the others. fetch() has no timeout
  // of its own, and without one a host that accepts the connection and then
  // stalls would hold the map blank instead of falling back.
  const abort = new AbortController();
  const timer = window.setTimeout(() => abort.abort(), STYLE_TIMEOUT_MS);

  styleRequest = fetch(VECTOR_STREET.styleUrl, { signal: abort.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`Style HTTP ${response.status}`);
      return response.json();
    })
    // Rewriting the style here rather than handing MapLibre the URL is what
    // gets Latin labels into the very first frame; the URL form would paint
    // Korean labels and then repaint.
    .then((raw: MapStyle) => toLatinLabels(raw))
    .catch((cause) => {
      styleRequest = null;
      throw cause;
    })
    .finally(() => window.clearTimeout(timer));

  return styleRequest;
}

/** Resolves once MapLibre has drawn, rejects if it never gets there. */
function waitForFirstFrame(gl: Pick<MapLibreMap, 'loaded' | 'once'>) {
  if (gl.loaded()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Basemap did not finish loading')),
      GL_LOAD_TIMEOUT_MS,
    );
    gl.once('load', () => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

export default function StreetBasemap() {
  const map = useMap();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (fallback) return;

    let cancelled = false;
    let layer: Layer | null = null;

    // A layer that failed part-way through addTo() is still registered with the
    // map, and its own onRemove can then throw on the way out. Neither is worth
    // taking the page down for.
    const removeLayer = () => {
      if (!layer) return;
      try {
        map.removeLayer(layer);
      } catch {
        /* already gone */
      }
      layer = null;
    };

    void (async () => {
      try {
        const style = await loadStyle();

        // Loaded on demand: MapLibre is by far the largest dependency here, and
        // keeping it out of the entry chunk lets the app shell, the filter bar
        // and the school list paint before the basemap engine arrives.
        const [{ maplibreGL }] = await Promise.all([
          import('@maplibre/maplibre-gl-leaflet'),
          import('maplibre-gl'),
        ]);
        if (cancelled) return;

        // `customAttribution`, not Leaflet's usual `attribution` option: the
        // bridge overrides getAttribution() to read this instead, and silently
        // credits nobody if it is missing. MapLibre's own attribution control
        // stays off — the bridge forces it off so Leaflet's is the only one.
        const glLayer = maplibreGL({
          style,
          attributionControl: { customAttribution: VECTOR_STREET.attribution },
        });
        layer = glLayer;

        // MapLibre's constructor throws when it cannot get a WebGL context, and
        // the bridge builds the MapLibre map inside onAdd — so this line is
        // where a machine without WebGL lands in the catch below.
        glLayer.addTo(map);

        await waitForFirstFrame(glLayer.getMaplibreMap());
        if (cancelled) return;
      } catch {
        if (cancelled) return;
        removeLayer();
        setFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      removeLayer();
    };
  }, [map, fallback]);

  if (!fallback) return null;

  return (
    <TileLayer
      attribution={RASTER_STREET.attribution}
      url={RASTER_STREET.url}
      maxZoom={RASTER_STREET.maxZoom}
      tileSize={RASTER_STREET.tileSize}
      zoomOffset={RASTER_STREET.zoomOffset}
    />
  );
}
