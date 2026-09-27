import type { ProvinceMeta } from './provinceMeta';

/**
 * Display metadata for Taiwan's 22 counties and cities, keyed by the `code`
 * (COUNTYSN) carried in `src/data/taiwan-counties.json`. Same shape and same
 * reasoning as the Korea table in `provinceMeta.ts` — read that header first.
 *
 * `city` covers the six special municipalities and the three provincial
 * cities; they hold the universities, so they are drawn bold. The rest are
 * counties.
 *
 * The north is the crowded part. New Taipei rings Taipei the way Gyeonggi rings
 * Seoul, with Keelung wedged against both and Taoyuan next door, and Taipei is
 * where the pins cluster. So Taipei is lifted clear above its own cluster and
 * the ring's names are pushed out to the ring's edges.
 */
export const TAIWAN_META: Record<string, ProvinceMeta> = {
  // Special municipalities.
  // Lifted like Seoul: the Taipei cluster bubble sits on the city itself.
  '63000001': { label: 'Taipei', kind: 'city', anchor: [25.06, 121.56], offset: [0, -34] },
  // Out in the southern mountains of the ring, away from Taipei's cluster.
  '10001001': { label: 'New Taipei', kind: 'city', anchor: [24.86, 121.6], offset: [0, 0] },
  '10003001': { label: 'Taoyuan', kind: 'city', anchor: [24.93, 121.22] },
  '10006001': { label: 'Taichung', kind: 'city', anchor: [24.15, 120.68] },
  '10011001': { label: 'Tainan', kind: 'city', anchor: [23.0, 120.23] },
  '10012001': { label: 'Kaohsiung', kind: 'city', anchor: [22.63, 120.3] },

  // Provincial cities.
  // East of Taipei on the coast; nudged out to sea so it clears the Taipei label.
  '10017001': { label: 'Keelung', kind: 'city', anchor: [25.13, 121.74], offset: [22, -10] },
  '10018001': { label: 'Hsinchu', kind: 'city', anchor: [24.8, 120.97] },
  '10020001': { label: 'Chiayi', kind: 'city', anchor: [23.48, 120.45] },

  // Counties. Largely free of pins, so they sit on their anchor.
  // Hsinchu County wraps Hsinchu City, whose name drops 20px below its point;
  // the county's goes inland and further south so the two never touch.
  '10004001': { label: 'Hsinchu Co.', kind: 'province', anchor: [24.6, 121.22] },
  '10005001': { label: 'Miaoli', kind: 'province', anchor: [24.49, 120.93] },
  // A little south of centre: straight above it is Taichung's dropped name.
  '10007001': { label: 'Changhua', kind: 'province', anchor: [23.92, 120.47] },
  '10008001': { label: 'Nantou', kind: 'province', anchor: [23.84, 120.98] },
  '10009001': { label: 'Yunlin', kind: 'province', anchor: [23.7, 120.38] },
  // Chiayi County likewise surrounds Chiayi City; label it well to the east.
  '10010001': { label: 'Chiayi Co.', kind: 'province', anchor: [23.42, 120.8] },
  '10013001': { label: 'Pingtung', kind: 'province', anchor: [22.55, 120.62] },
  '10002001': { label: 'Yilan', kind: 'province', anchor: [24.62, 121.65] },
  '10015001': { label: 'Hualien', kind: 'province', anchor: [23.85, 121.42] },
  '10014001': { label: 'Taitung', kind: 'province', anchor: [22.95, 121.05] },
  '10016001': { label: 'Penghu', kind: 'province', anchor: [23.57, 119.58] },
  '09020001': { label: 'Kinmen', kind: 'province', anchor: [24.44, 118.35] },
  '09007001': { label: 'Matsu', kind: 'province', anchor: [26.16, 119.95] },
};
