import { useCallback, useEffect, useMemo, useState } from 'react';
import L, { type Map as LeafletMap } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import AppHeader from '../components/AppHeader';
import { BASEMAPS, type Basemap } from './basemaps';
import { EMPTY_FILTERS } from '../lib/filters';
import { useFullscreen } from '../lib/useFullscreen';
import { useUniversityBrowser } from '../lib/useUniversityBrowser';
import type { University } from '../lib/types';
import DetailDrawer from './DetailDrawer';
import FilterBar from './FilterBar';
import MapControls from './MapControls';
import ProvinceLayer from './ProvinceLayer';
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
/** At or below this zoom the map is the vector province map — street tiles are
 *  faded out and the divisions carry their own names. Above it the tiles fade
 *  back in and the provinces drop to plain outlines. Because this sits well
 *  below LABEL_MIN_ZOOM, province names and school names are never both up. */
const PROVINCE_SOLO_MAX_ZOOM = 8;
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
function MapController({
  selected,
  mobileView,
  basemap,
}: {
  selected: University | null;
  mobileView: MobileView;
  basemap: Basemap;
}) {
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

  // Toggling container classes beats re-rendering every marker on each zoom.
  useEffect(() => {
    const sync = () => {
      const zoom = map.getZoom();
      const classes = map.getContainer().classList;
      classes.toggle('pins-labeled', zoom >= LABEL_MIN_ZOOM);
      classes.toggle('provinces-solo', zoom <= PROVINCE_SOLO_MAX_ZOOM);
    };
    sync();
    map.on('zoomend', sync);
    return () => {
      map.off('zoomend', sync);
    };
  }, [map]);

  // Satellite is an explicit request to see imagery, so it opts out of the
  // vector province view: the tiles stay up at every zoom (see app.css).
  useEffect(() => {
    map.getContainer().classList.toggle('basemap-satellite', basemap === 'satellite');
  }, [basemap, map]);

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
  hovered,
  onSelect,
  onHover,
}: {
  university: University;
  selected: boolean;
  /** True only for a hover that started in the list — see the note below. */
  hovered: boolean;
  onSelect: (u: University) => void;
  onHover: (u: University | null, from: 'map') => void;
}) {
  const icon = useMemo(
    () => createSchoolIcon(university, selected, hovered),
    [university, selected, hovered],
  );

  return (
    <Marker
      position={[university.lat, university.lng]}
      icon={icon}
      // Leaflet derives each marker's z-index from latitude, so CSS alone
      // cannot lift the active pin above its neighbours.
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect(university),
        // Highlights the row in the list. It deliberately does NOT rebuild this
        // icon: setIcon() swaps the DOM node out from under the pointer, which
        // would fire mouseout and oscillate. The pin under the mouse is already
        // brightened by the .school-pin:hover rule.
        mouseover: () => onHover(university, 'map'),
        mouseout: () => onHover(null, 'map'),
      }}
    />
  );
}

export default function MapView() {
  const { universities, filtered, loading, error, filters, setFilters, selected, setSelected } =
    useUniversityBrowser();
  const [sort, setSort] = useState<SortKey>('ranking');
  const [mobileView, setMobileView] = useState<MobileView>('map');
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [basemap, setBasemap] = useState<Basemap>('street');
  const tiles = BASEMAPS[basemap];

  const [presentation, setPresentation] = useState(false);
  const { active: isFullscreen, request: requestFullscreen, exit: exitFullscreen } = useFullscreen();

  // Escape and F11 leave fullscreen without touching our button, so follow the
  // browser back out of presentation mode rather than stranding the layout in
  // it. Fullscreen entered by other means is ignored — only leaving matters.
  useEffect(() => {
    if (!isFullscreen) setPresentation(false);
  }, [isFullscreen]);

  const togglePresentation = () => {
    const next = !presentation;
    setPresentation(next);
    // Styling applies regardless; fullscreen is best-effort on top of it.
    if (next) void requestFullscreen();
    else void exitFullscreen();
  };

  // Hiding the header and filter bar resizes the map container, and Leaflet
  // caches its size. Re-measure once the CSS transition has settled.
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 260);
    return () => clearTimeout(t);
  }, [presentation, map]);

  // Which school the pointer is over, and where the pointer is. `from` is what
  // keeps the two directions from fighting: only a hover that started in the
  // list restyles the pin (see SchoolMarker).
  const [hovered, setHovered] = useState<{ id: string; from: 'list' | 'map' } | null>(null);
  const handleHover = useCallback((u: University | null, from: 'list' | 'map') => {
    setHovered(u ? { id: u.id, from } : null);
  }, []);

  return (
    <div className={`map-page mobile-${mobileView}${presentation ? ' presentation' : ''}`}>
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
            {/* Keyed on the basemap: react-leaflet cannot swap a tile layer's
                url and tileSize in place, so the layer is remounted instead. */}
            <TileLayer
              key={basemap}
              attribution={tiles.attribution}
              url={tiles.url}
              maxZoom={tiles.maxZoom}
              tileSize={tiles.tileSize}
              zoomOffset={tiles.zoomOffset}
            />
            <ProvinceLayer />
            <MapController selected={selected} mobileView={mobileView} basemap={basemap} />
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
                  hovered={hovered?.from === 'list' && hovered.id === u.id}
                  onSelect={setSelected}
                  onHover={handleHover}
                />
              ))}
            </MarkerClusterGroup>
          </MapContainer>

          <MapControls
            map={map}
            home={HOME_VIEW}
            basemap={basemap}
            onBasemapChange={setBasemap}
            presentation={presentation}
            onPresentationToggle={togglePresentation}
          />


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
          query={filters.q}
          loading={loading}
          totalCount={universities.length}
          hoveredId={hovered?.id ?? null}
          onHover={handleHover}
          onClearFilters={() => setFilters(EMPTY_FILTERS)}
        />

      </div>
    </div>
  );
}
