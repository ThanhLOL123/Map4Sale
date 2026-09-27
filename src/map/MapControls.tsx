import type { LatLngExpression, Map as LeafletMap } from 'leaflet';
import { satelliteAvailable, type Basemap } from './basemaps';

interface Props {
  map: LeafletMap | null;
  /** The nation-wide framing the reset button returns to. */
  home: { center: LatLngExpression; zoom: number };
  /** Tooltip for that button, naming the country ("Xem toàn Đài Loan"). */
  homeLabel: string;
  basemap: Basemap;
  onBasemapChange: (next: Basemap) => void;
  presentation: boolean;
  onPresentationToggle: () => void;
}

/**
 * Floating map controls, Naver-style: rounded buttons stacked at the map's
 * edge. Rendered as a sibling of <MapContainer> rather than as an L.Control,
 * so the buttons live outside Leaflet's DOM and their clicks/wheel events
 * never reach the map — no DomEvent.disableClickPropagation plumbing needed.
 */
export default function MapControls({
  map,
  home,
  homeLabel,
  basemap,
  onBasemapChange,
  presentation,
  onPresentationToggle,
}: Props) {
  if (!map) return null;

  const satellite = basemap === 'satellite';

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
        aria-label={homeLabel}
        title={homeLabel}
        onClick={() => map.flyTo(home.center, home.zoom, { duration: 0.6 })}
      >
        <svg viewBox="0 0 20 20" aria-hidden focusable="false">
          <circle cx="10" cy="10" r="5.5" />
          <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
        </svg>
      </button>

      {/* Hidden entirely when no Mapbox token is configured — the app must stay
          usable, and demo mode fully browsable, without a Mapbox account. */}
      {satelliteAvailable && (
        <button
          type="button"
          className={`map-control${satellite ? ' map-control-active' : ''}`}
          aria-label={satellite ? 'Chuyển sang bản đồ đường' : 'Chuyển sang ảnh vệ tinh'}
          title={satellite ? 'Bản đồ đường' : 'Ảnh vệ tinh'}
          aria-pressed={satellite}
          onClick={() => onBasemapChange(satellite ? 'street' : 'satellite')}
        >
          <svg viewBox="0 0 20 20" aria-hidden focusable="false">
            <path d="M2.5 13.5 10 17l7.5-3.5M2.5 10 10 13.5 17.5 10" />
            <path d="M10 3 17.5 6.5 10 10 2.5 6.5 10 3Z" />
          </svg>
        </button>
      )}

      {/* Once presentation mode hides the header, this is the only way out —
          so it stays in the control stack rather than living in the chrome. */}
      <button
        type="button"
        className={`map-control map-control-present${presentation ? ' map-control-active' : ''}`}
        aria-label={presentation ? 'Thoát chế độ trình chiếu' : 'Chế độ trình chiếu'}
        title={presentation ? 'Thoát trình chiếu' : 'Chế độ trình chiếu'}
        aria-pressed={presentation}
        onClick={onPresentationToggle}
      >
        <svg viewBox="0 0 20 20" aria-hidden focusable="false">
          {presentation ? (
            <path d="M8 2.5v5.5H2.5M12 17.5V12h5.5" />
          ) : (
            <path d="M2.5 7.5v-5h5M17.5 12.5v5h-5M17.5 7.5v-5h-5M2.5 12.5v5h5" />
          )}
        </svg>
      </button>
    </div>
  );
}
