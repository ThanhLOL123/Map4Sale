import type { FeatureCollection } from 'geojson';
import koreaData from '../data/korea-provinces.json';
import taiwanData from '../data/taiwan-counties.json';
import type { CountryCode } from '../lib/countries';
import { PROVINCE_META, type ProvinceMeta } from './provinceMeta';
import { TAIWAN_META } from './taiwanMeta';

/**
 * The boundary overlay for each country: shapes, hand-placed labels, and the
 * credit for the boundary data. The credit rides on the GeoJSON layer rather
 * than on the tile layers, so Leaflet's attribution bar names KOSTAT on the
 * Korea map and the Taiwan source on the Taiwan map without the basemaps
 * having to know which country is showing.
 */
export interface CountryMap {
  // The imports are plain JSON modules, so TS widens `coordinates` to a union
  // of Polygon/MultiPolygon shapes that no longer matches the GeoJSON types.
  shapes: FeatureCollection;
  labels: Record<string, ProvinceMeta>;
  credit: string;
}

export const COUNTRY_MAPS: Record<CountryCode, CountryMap> = {
  kr: {
    shapes: koreaData as unknown as FeatureCollection,
    labels: PROVINCE_META,
    credit: 'Ranh giới hành chính: <a href="https://kostat.go.kr">KOSTAT</a>',
  },
  tw: {
    // g0v/twgeojson twCounty2010 (CC0), simplified with mapshaper to ~80 KB.
    shapes: taiwanData as unknown as FeatureCollection,
    labels: TAIWAN_META,
    credit: 'Ranh giới hành chính: <a href="https://github.com/g0v/twgeojson">g0v twgeojson</a>',
  },
};
