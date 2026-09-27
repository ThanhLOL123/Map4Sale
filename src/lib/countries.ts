import type { CountryCode } from './types';

export type { CountryCode };

export interface TuitionPreset {
  /** Compared against the first number in the tuition text; see `unitNote`. */
  value: number;
  label: string;
}

/**
 * Everything that differs between the Korea map and the Taiwan map, except the
 * boundary data (that lives beside the map code in `src/map/countryMaps.ts`).
 * Any Korea- or Taiwan-specific literal belongs here, not in a component.
 *
 * Korea's values are exactly what the app used before Taiwan existed.
 */
export interface CountryConfig {
  code: CountryCode;
  /** Vietnamese name, as shown on the switch and in labels. */
  label: string;
  /** Nation-wide framing for first load, the switch and the home button. */
  home: { center: [number, number]; zoom: number };
  /** First-level divisions offered in the admin form. The map's region filter
   *  still derives its options from the schools actually loaded. */
  regions: string[];
  /** Admin form label for `name_kr`, which holds the name in the local script. */
  nativeNameLabel: string;
  /** Name of the language test stored in `topik_req`. */
  languageTest: string;
  tuition: {
    /** What the first number in the tuition text is read as. */
    unitNote: string;
    presets: TuitionPreset[];
    /** Admin form label for the tuition editor. */
    formHint: string;
  };
  /** Where a new school's pin starts in the admin form. */
  defaultPin: [number, number];
  /** ISO 3166-1 alpha-2, for Nominatim's `countrycodes`. */
  geocodeCode: string;
}

const TUITION_TABLE_NOTE =
  'Nếu dùng bảng, đặt số tiền ở ô thường, không đặt ở ô tiêu đề.';

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  kr: {
    code: 'kr',
    label: 'Hàn Quốc',
    home: { center: [36.35, 127.8], zoom: 7 },
    regions: [
      'Seoul', 'Gyeonggi', 'Incheon', 'Busan', 'Daegu', 'Daejeon', 'Gwangju',
      'Ulsan', 'Sejong', 'Gangwon', 'Chungbuk', 'Chungnam', 'Jeonbuk', 'Jeonnam',
      'Gyeongbuk', 'Gyeongnam', 'Jeju',
    ],
    nativeNameLabel: 'Tên tiếng Hàn',
    languageTest: 'TOPIK',
    tuition: {
      unitNote: 'triệu KRW/kỳ',
      presets: [
        { value: 2.5, label: '≤ 2.5 triệu KRW/kỳ' },
        { value: 4, label: '≤ 4 triệu KRW/kỳ' },
        { value: 5, label: '≤ 5 triệu KRW/kỳ' },
        { value: 6, label: '≤ 6 triệu KRW/kỳ' },
      ],
      formHint:
        'Học phí (số đầu tiên trong nội dung dùng để lọc và sắp xếp — hãy mở đầu bằng số ' +
        'triệu KRW/kỳ, ví dụ: “4.2 triệu KRW/kỳ …”. ' + TUITION_TABLE_NOTE + ')',
    },
    defaultPin: [37.5665, 126.978],
    geocodeCode: 'kr',
  },

  tw: {
    code: 'tw',
    label: 'Đài Loan',
    // Frames the main island; Kinmen sits at the left edge, Matsu off the top.
    home: { center: [23.65, 120.95], zoom: 8 },
    regions: [
      'Taipei', 'New Taipei', 'Keelung', 'Taoyuan', 'Hsinchu', 'Hsinchu County',
      'Miaoli', 'Taichung', 'Changhua', 'Nantou', 'Yunlin', 'Chiayi',
      'Chiayi County', 'Tainan', 'Kaohsiung', 'Pingtung', 'Yilan', 'Hualien',
      'Taitung', 'Penghu', 'Kinmen', 'Lienchiang',
    ],
    nativeNameLabel: 'Tên tiếng Trung (phồn thể)',
    languageTest: 'TOCFL',
    tuition: {
      // Staff write "55.000 TWD/kỳ", which the parser in filters.ts reads as 55
      // — so the natural way to type it already lands in thousands.
      unitNote: 'nghìn TWD/kỳ',
      presets: [
        { value: 40, label: '≤ 40.000 TWD/kỳ' },
        { value: 50, label: '≤ 50.000 TWD/kỳ' },
        { value: 60, label: '≤ 60.000 TWD/kỳ' },
        { value: 80, label: '≤ 80.000 TWD/kỳ' },
      ],
      formHint:
        'Học phí (số đầu tiên trong nội dung dùng để lọc và sắp xếp — hãy mở đầu bằng số ' +
        'TWD/kỳ, ví dụ: “55.000 TWD/kỳ …”. ' + TUITION_TABLE_NOTE + ')',
    },
    defaultPin: [25.0173, 121.5398],
    geocodeCode: 'tw',
  },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && value in COUNTRIES;
}
