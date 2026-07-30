import type { LatLngExpression, Map as LeafletMap } from 'leaflet';

interface Props {
  map: LeafletMap | null;
  /** The nation-wide framing the reset button returns to. */
  home: { center: LatLngExpression; zoom: number };
}

/**
 * Floating map controls, Naver-style: rounded buttons stacked at the map's
 * edge. Rendered as a sibling of <MapContainer> rather than as an L.Control,
 * so the buttons live outside Leaflet's DOM and their clicks/wheel events
 * never reach the map — no DomEvent.disableClickPropagation plumbing needed.
 */
export default function MapControls({ map, home }: Props) {
  if (!map) return null;

  return (
    <div className="map-controls">
      <button
        type="button"
        className="map-control"
        aria-label="Phóng to"
        title="Phóng to"
        onClick={() => map.zoomIn()}
      >
        <svg viewBox="0 0 20 20" aria-hidden focusable="false">
          <path d="M10 4.5v11M4.5 10h11" />
        </svg>
      </button>

      <button
        type="button"
        className="map-control"
        aria-label="Thu nhỏ"
        title="Thu nhỏ"
        onClick={() => map.zoomOut()}
      >
        <svg viewBox="0 0 20 20" aria-hidden focusable="false">
          <path d="M4.5 10h11" />
        </svg>
      </button>

      <button
        type="button"
        className="map-control"
        aria-label="Xem toàn Hàn Quốc"
        title="Xem toàn Hàn Quốc"
        onClick={() => map.flyTo(home.center, home.zoom, { duration: 0.6 })}
      >
        <svg viewBox="0 0 20 20" aria-hidden focusable="false">
          <circle cx="10" cy="10" r="5.5" />
          <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
        </svg>
      </button>
    </div>
  );
}
