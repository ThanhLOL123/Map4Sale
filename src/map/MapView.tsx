import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchUniversities } from '../lib/api';
import { EMPTY_FILTERS, filterUniversities, type UniversityFilters } from '../lib/filters';
import { isDemoMode } from '../lib/supabase';
import type { University } from '../lib/types';
import DetailDrawer from './DetailDrawer';
import FilterBar from './FilterBar';
import './leafletIcon';

// South Korea, framed nation-wide
const KOREA_CENTER: [number, number] = [36.35, 127.8];
const KOREA_ZOOM = 7;

export default function MapView() {
  const { profile, isAdmin, signOut } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UniversityFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<University | null>(null);

  useEffect(() => {
    fetchUniversities()
      .then(setUniversities)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.'));
  }, []);

  const filtered = useMemo(
    () => filterUniversities(universities, filters),
    [universities, filters],
  );

  return (
    <div className="map-page">
      <header className="app-header">
        <span className="app-title">🗺️ Map4Sale</span>
        {isDemoMode && <span className="badge badge-demo">DEMO</span>}
        <div className="app-header-right">
          {isAdmin && <Link to="/admin" className="btn btn-ghost">Quản trị</Link>}
          <span className="user-email">{profile?.email}</span>
          {!isDemoMode && (
            <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
              Đăng xuất
            </button>
          )}
        </div>
      </header>

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
