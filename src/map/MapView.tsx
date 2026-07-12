import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import AppHeader from '../components/AppHeader';
import { useUniversityBrowser } from '../lib/useUniversityBrowser';
import DetailDrawer from './DetailDrawer';
import FilterBar from './FilterBar';
import './leafletIcon';

// South Korea, framed nation-wide
const KOREA_CENTER: [number, number] = [36.35, 127.8];
const KOREA_ZOOM = 7;

export default function MapView() {
  const { universities, filtered, error, filters, setFilters, selected, setSelected } =
    useUniversityBrowser();

  return (
    <div className="map-page">
      <AppHeader />

      <FilterBar
        universities={universities}
        filters={filters}
        onChange={setFilters}
        matchCount={filtered.length}
      />

      {error && <p className="form-error map-error">{error}</p>}

      <div className="map-wrap">
        <MapContainer center={KOREA_CENTER} zoom={KOREA_ZOOM} className="leaflet-host">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
    </div>
  );
}
