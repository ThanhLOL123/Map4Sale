/**
 * Display metadata for South Korea's 17 first-level administrative divisions,
 * keyed by the KOSTAT `code` carried in `src/data/korea-provinces.json`.
 *
 * Three things the raw GeoJSON cannot give us:
 *
 * 1. **Short labels.** Its `name_eng` is the formal romanisation
 *    ("Gyeongsangnam-do"); maps conventionally show the colloquial short form
 *    ("Gyeongnam"), which is what fits at national zoom.
 * 2. **Label anchors.** A polygon centroid is the obvious choice and the wrong
 *    one here: Gyeonggi is a ring around Seoul, so its centroid lands inside
 *    Seoul, and Jeonnam's island chain drags its centroid out to sea. These
 *    are hand-placed instead — nudge them, don't compute them.
 * 3. **Pixel offsets.** School pins sit on the same cities these labels name.
 *    Since a pin's tail tip is on its coordinate and its body extends ~46px
 *    upward, a label centred on a city is covered by it. `offset` moves the
 *    label clear, in screen pixels, so the anchor can stay geographically
 *    honest. Defaults come from DEFAULT_OFFSET in ProvinceLayer.
 */

export type ProvinceKind = 'city' | 'province';

export interface ProvinceMeta {
  /** Short label as drawn on the map. */
  label: string;
  /** Metropolitan/special city vs province — drives label weight and default offset. */
  kind: ProvinceKind;
  /** Label position before offset, [lat, lng]. */
  anchor: [number, number];
  /** Optional nudge in screen pixels, [right, down]. Overrides the kind default. */
  offset?: [number, number];
}

export const PROVINCE_META: Record<string, ProvinceMeta> = {
  // Special, metropolitan and special self-governing cities.
  // These carry schools, so most need an offset to clear their own pins.

  // Seoul holds 14 of 22 schools; at national zoom that is one fat cluster
  // bubble sitting exactly on the label. Lift the name clear above it.
  '11': { label: 'Seoul', kind: 'city', anchor: [37.5665, 126.978], offset: [0, -34] },
  '21': { label: 'Busan', kind: 'city', anchor: [35.18, 129.08] },
  '22': { label: 'Daegu', kind: 'city', anchor: [35.8714, 128.6014] },
  // Pulled west of the city proper: due-north of Incheon is the Seoul cluster.
  '23': { label: 'Incheon', kind: 'city', anchor: [37.42, 126.5] },
  '24': { label: 'Gwangju', kind: 'city', anchor: [35.1595, 126.8526] },
  '25': { label: 'Daejeon', kind: 'city', anchor: [36.3504, 127.3845] },
  // Nudged out over the coast — straight down from Ulsan is the Busan pin.
  '26': { label: 'Ulsan', kind: 'city', anchor: [35.62, 129.38], offset: [14, -6] },
  // Sejong is tiny and sits directly on top of Daejeon, whose pin occupies the
  // space above it. Swing the name out to the north-west instead.
  '29': { label: 'Sejong', kind: 'city', anchor: [36.55, 127.25], offset: [-34, -20] },

  // Provinces. Largely free of pins, so they sit on their anchor.
  '31': { label: 'Gyeonggi', kind: 'province', anchor: [37.25, 127.2] },
  '32': { label: 'Gangwon', kind: 'province', anchor: [37.75, 128.3] },
  '33': { label: 'Chungbuk', kind: 'province', anchor: [36.85, 127.8] },
  // Held out in the western bulge to leave Sejong the gap beside Daejeon.
  '34': { label: 'Chungnam', kind: 'province', anchor: [36.5, 126.5] },
  '35': { label: 'Jeonbuk', kind: 'province', anchor: [35.75, 127.1] },
  // Kept south-west of Gwangju, which sits inside Jeonnam and labels itself.
  '36': { label: 'Jeonnam', kind: 'province', anchor: [34.78, 126.72] },
  '37': { label: 'Gyeongbuk', kind: 'province', anchor: [36.45, 128.95] },
  '38': { label: 'Gyeongnam', kind: 'province', anchor: [35.35, 128.25] },
  '39': { label: 'Jeju', kind: 'province', anchor: [33.4, 126.55] },
};
