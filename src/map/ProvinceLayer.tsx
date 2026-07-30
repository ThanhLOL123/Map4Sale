import { useEffect } from 'react';
import L from 'leaflet';
import { GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import provinceData from '../data/korea-provinces.json';
import { PROVINCE_META, type ProvinceKind } from './provinceMeta';

/**
 * South Korea's 17 administrative divisions, drawn beneath the school pins.
 *
 * Purely decorative: every layer here is non-interactive so clicks fall through
 * to the markers. Visibility is driven entirely from CSS off the `.provinces-solo`
 * class that `MapController` toggles on zoom — nothing in this module re-renders
 * when the user zooms.
 */

// The import is a plain JSON module, so TS widens `coordinates` to a union of
// Polygon/MultiPolygon shapes that no longer matches the GeoJSON types.
const provinces = provinceData as unknown as FeatureCollection;

/** Sits between the polygons (overlayPane, 400) and the school pins (markerPane, 600). */
const LABEL_PANE = 'province-labels';
const LABEL_PANE_Z = '450';

/** Fill and stroke live in app.css so the zoom transition can be pure CSS. */
const SHAPE_STYLE = { className: 'province-shape' };

/**
 * Where a label sits relative to its anchor, in screen pixels, when the entry
 * in PROVINCE_META does not override it. Cities drop below their point: a pin's
 * tail tip is on the coordinate and its body extends ~46px *upward*, so the
 * space underneath is the one place a city name is never covered by its own
 * pin. Provinces are mostly free of pins and stay centred.
 */
const DEFAULT_OFFSET: Record<ProvinceKind, [number, number]> = {
  city: [0, 20],
  province: [0, 0],
};

/**
 * Province names, added imperatively rather than as <Marker> children: the pane
 * they belong to has to exist before any marker mounts into it, and React runs
 * child effects before parent effects. Building them here keeps the pane
 * creation and the markers in one effect, in the right order.
 */
function ProvinceLabels() {
  const map = useMap();

  useEffect(() => {
    // createPane() unconditionally appends a new div, so re-running this effect
    // (StrictMode, fast refresh) would orphan the previous one.
    const pane = map.getPane(LABEL_PANE) ?? map.createPane(LABEL_PANE);
    pane.style.zIndex = LABEL_PANE_Z;
    pane.style.pointerEvents = 'none';

    const labels = Object.values(PROVINCE_META).map((meta) => {
      const [dx, dy] = meta.offset ?? DEFAULT_OFFSET[meta.kind];
      return L.marker(meta.anchor, {
        pane: LABEL_PANE,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: `province-label province-label-${meta.kind}`,
          // Labels are our own constants, so no escaping is needed here.
          html: `<span class="province-label-text">${meta.label}</span>`,
          // A zero-size icon anchors the box exactly on the coordinate; the
          // inner span then centres itself on it, whatever the name's width.
          // Leaflet places the box at (point - iconAnchor), so the offset is
          // negated to read as "move the label right and down".
          iconSize: [0, 0],
          iconAnchor: [-dx, -dy],
        }),
      }).addTo(map);
    });

    return () => {
      labels.forEach((label) => label.remove());
    };
  }, [map]);

  return null;
}

export default function ProvinceLayer() {
  return (
    <>
      <GeoJSON data={provinces} interactive={false} style={SHAPE_STYLE} />
      <ProvinceLabels />
    </>
  );
}
