import { useEffect, useMemo, useState } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import AppHeader from '../components/AppHeader';
import { EMPTY_FILTERS } from '../lib/filters';
import { useUniversityBrowser } from '../lib/useUniversityBrowser';
import type { University } from '../lib/types';
import DetailDrawer from './DetailDrawer';
import FilterBar from './FilterBar';
import MapControls from './MapControls';
import SideList, { type SortKey } from './SideList';
import { createClusterIcon, createSchoolIcon } from './schoolIcon';
import './leafletIcon';

// South Korea, framed nation-wide
const KOREA_CENTER: [number, number] = [36.35, 127.8];
const KOREA_ZOOM = 7;
const HOME_VIEW = { center: KOREA_CENTER as L.LatLngExpression, zoom: KOREA_ZOOM };

/** Pin name labels only appear once the pins have room to breathe. Below this
 *  the Seoul cluster (14 of 22 schools) overlaps into an unreadable stack. */
const LABEL_MIN_ZOOM = 11;
/** Keep in sync with the --drawer-w token in app.css. */
const DRAWER_WIDTH = 430;
/** Matches the single CSS breakpoint; below it the drawer is a bottom sheet. */
const WIDE_VIEWPORT = 768;

type MobileView = 'map' | 'list';

/**
 * Pans to the selected school, drives zoom-dependent label visibility, and
 * re-measures the map after it becomes visible again on mobile (Leaflet
 * mis-sizes when its container was display:none).
 */
function MapController({ selected, mobileView }: { selected: University | null; mobileView: MobileView }) {
  const map = useMap();

  useEffect(() => {
    if (!selected) return;
    const target = L.latLng(selected.lat, selected.lng);
    const zoom = Math.max(map.getZoom(), 11);
    const width = map.getSize().x;
    // On desktop the drawer covers the map's right edge, so shift the centre
    // right of the pin by half the drawer width to keep it in the open strip.
    const center =
      width > WIDE_VIEWPORT
        ? map.unproject(
            map.project(target, zoom).add([Math.min(DRAWER_WIDTH, width * 0.92) / 2, 0]),
            zoom,
          )
        : target;
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [selected, map]);

  // Toggling one container class beats re-rendering every marker on each zoom.
  useEffect(() => {
    const sync = () =>
      map.getContainer().classList.toggle('pins-labeled', map.getZoom() >= LABEL_MIN_ZOOM);
    sync();
    map.on('zoomend', sync);
    return () => {
      map.off('zoomend', sync);
    };
  }, [map]);

  useEffect(() => {
    if (mobileView === 'map') setTimeout(() => map.invalidateSize(), 0);
  }, [mobileView, map]);

  return null;
}

/**
 * One school pin. The icon is memoized so react-leaflet only calls setIcon()
 * when the selected state actually flips — rebuilding it on every render would
 * rewrite all 22 icon subtrees on each keystroke in the search box.
 */
function SchoolMarker({
  university,
  selected,
  onSelect,
}: {
  university: University;
  selected: boolean;
  onSelect: (u: University) => void;
}) {
  const icon = useMemo(() => createSchoolIcon(university, selected), [university, selected]);

  return (
    <Marker
      position={[university.lat, university.lng]}
      icon={icon}
      // Leaflet derives each marker's z-index from latitude, so CSS alone
      // cannot lift the active pin above its neighbours.
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(university) }}
    />
  );
}

export default function MapView() {
  const { universities, filtered, loading, error, filters, setFilters, selected, setSelected } =
    useUniversityBrowser();
  const [sort, setSort] = useState<SortKey>('ranking');
  const [mobileView, setMobileView] = useState<MobileView>('map');
  const [map, setMap] = useState<LeafletMap | null>(null);

  const noneAtAll = !loading && !error && universities.length === 0;
  const noneMatching = !loading && !error && universities.length > 0 && filtered.length === 0;

  return (
    <div className={`map-page mobile-${mobileView}`}>
      <AppHeader />

      <FilterBar
        universities={universities}
        filters={filters}
        onChange={setFilters}
        matchCount={filtered.length}
      />

      <nav className="mobile-view-toggle" aria-label="Chế độ xem">
        <button
          type="button"
          className={mobileView === 'map' ? 'active' : ''}
          onClick={() => setMobileView('map')}
        >
          🗺️ Bản đồ
        </button>
        <button
          type="button"
          className={mobileView === 'list' ? 'active' : ''}
          onClick={() => setMobileView('list')}
        >
          📋 Danh sách
        </button>
      </nav>

      {error && <p className="form-error map-error">{error}</p>}

      <div className="map-body">
        <div className={`map-wrap${selected ? ' has-detail' : ''}`}>
          <MapContainer
            ref={setMap}
            center={KOREA_CENTER}
            zoom={KOREA_ZOOM}
            minZoom={6}
            zoomControl={false} // replaced by <MapControls />
            className="leaflet-host"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
            <MapController selected={selected} mobileView={mobileView} />
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={45}
              iconCreateFunction={createClusterIcon}
              showCoverageOnHover={false}
            >
              {filtered.map((u) => (
                <SchoolMarker
                  key={u.id}
                  university={u}
                  selected={selected?.id === u.id}
                  onSelect={setSelected}
                />
              ))}
            </MarkerClusterGroup>
          </MapContainer>

          <MapControls map={map} home={HOME_VIEW} />

          {loading && (
            <div className="map-status" role="status">
              <span className="map-spinner" aria-hidden />
              Đang tải dữ liệu trường…
            </div>
          )}

          {noneAtAll && (
            <div className="map-status">Chưa có trường nào trong hệ thống.</div>
          )}

          {noneMatching && (
            <div className="map-status">
              Không có trường nào khớp bộ lọc.
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Xóa lọc
              </button>
            </div>
          )}

          {selected && (
            <DetailDrawer university={selected} onClose={() => setSelected(null)} />
          )}
        </div>

        <SideList
          universities={filtered}
          selected={selected}
          onSelect={(u) => {
            setSelected(u);
            setMobileView('map'); // on phones, jump to the map to show the school
          }}
          sort={sort}
          onSortChange={setSort}
        />
      </div>
    </div>
  );
}
