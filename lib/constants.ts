export const ITEMS_BY_CATEGORY = {
  Ruang: [
    'Bilik Perbincangan 1',
    'Bilik Perbincangan 2',
    'Makmal Komputer 1',
    'Makmal Komputer 2',
  ],
  Peralatan: [
    'Kamera DSLR',
    'Tripod',
    'Bola Futsal',
    'Raket Badminton',
  ],
} as const;

export type BookingCategory = keyof typeof ITEMS_BY_CATEGORY;

export const ALLOWED_ITEMS: readonly string[] = [
  ...ITEMS_BY_CATEGORY.Ruang,
  ...ITEMS_BY_CATEGORY.Peralatan,
];

export const ALLOWED_SLOTS = [
  '8:00-10:00',
  '10:00-12:00',
  '14:00-16:00',
  '16:00-18:00',
] as const;

export const ALLOWED_STATUSES = [
  'Menunggu',
  'Diluluskan',
  'Ditolak',
] as const;

export type BookingStatus = (typeof ALLOWED_STATUSES)[number];

export interface BookingDTO {
  id: string;
  nama_pemohon: string;
  item_tempahan: string;
  tarikh: string;
  slot_masa: string;
  status: BookingStatus;
  created_at: string;
}

export function getItemCategory(itemName: string): BookingCategory | 'Lain-lain' {
  if ((ITEMS_BY_CATEGORY.Ruang as readonly string[]).includes(itemName)) {
    return 'Ruang';
  }
  if ((ITEMS_BY_CATEGORY.Peralatan as readonly string[]).includes(itemName)) {
    return 'Peralatan';
  }
  return 'Lain-lain';
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
