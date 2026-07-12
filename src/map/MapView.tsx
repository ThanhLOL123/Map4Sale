import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import AppHeader from '../components/AppHeader';
import { useUniversityBrowser } from '../lib/useUniversityBrowser';
import type { University } from '../lib/types';
import DetailDrawer from './DetailDrawer';
import FilterBar from './FilterBar';
import SideList, { type SortKey } from './SideList';
import './leafletIcon';

// South Korea, framed nation-wide
const KOREA_CENTER: [number, number] = [36.35, 127.8];
const KOREA_ZOOM = 7;

type MobileView = 'map' | 'list';

/**
 * Pans to the selected school and re-measures the map after it becomes visible
 * again on mobile (Leaflet mis-sizes when its container was display:none).
 */
function MapController({ selected, mobileView }: { selected: University | null; mobileView: MobileView }) {
  const map = useMap();

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), { duration: 0.6 });
  }, [selected, map]);

  useEffect(() => {
    if (mobileView === 'map') setTimeout(() => map.invalidateSize(), 0);
  }, [mobileView, map]);

  return null;
}

export default function MapView() {
  const { universities, filtered, error, filters, setFilters, selected, setSelected } =
    useUniversityBrowser();
  const [sort, setSort] = useState<SortKey>('ranking');
  const [mobileView, setMobileView] = useState<MobileView>('map');

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
        <div className="map-wrap">
          <MapContainer center={KOREA_CENTER} zoom={KOREA_ZOOM} className="leaflet-host">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController selected={selected} mobileView={mobileView} />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
              {filtered.map((u) => (
                <Marker
                  key={u.id}
                  position={[u.lat, u.lng]}
                  eventHandlers={{ click: () => setSelected(u) }}
                >
                  <Tooltip direction="top" offset={[-15, -10]}>
                    <strong>{u.name_vi}</strong>
                    <br />
                    {u.city} · {u.type === 'public' ? 'Công lập' : 'Tư thục'}
                  </Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>

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
