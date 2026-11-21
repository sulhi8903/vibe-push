import type { Booking } from '@prisma/client';
import {
  ALLOWED_SLOTS,
  type BookingDTO,
  type BookingStatus,
} from './constants';

export function serializeBooking(row: Booking): BookingDTO {
  return {
    id: row.id,
    nama_pemohon: row.namaPemohon,
    item_tempahan: row.itemTempahan,
    tarikh: row.tarikh,
    slot_masa: row.slotMasa,
    status: row.status as BookingStatus,
    created_at: row.createdAt.toISOString(),
  };
}

export function sortBookings(bookings: BookingDTO[]): BookingDTO[] {
  return [...bookings].sort((a, b) => {
    if (a.tarikh !== b.tarikh) {
      return b.tarikh.localeCompare(a.tarikh);
    }
    const slotA = ALLOWED_SLOTS.indexOf(a.slot_masa as (typeof ALLOWED_SLOTS)[number]);
    const slotB = ALLOWED_SLOTS.indexOf(b.slot_masa as (typeof ALLOWED_SLOTS)[number]);
    if (slotA !== slotB) {
      return slotA - slotB;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function getDatabaseErrorMessage(error: unknown): {
  message: string;
  isConnectionError: boolean;
} {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (
    lower.includes('database_url') ||
    lower.includes('environment variable not found') ||
    lower.includes("can't reach database server") ||
    lower.includes('econnrefused') ||
    lower.includes('does not exist') ||
    lower.includes('relation "tempahan"')
  ) {
    return {
      message:
        'Pangkalan data PostgreSQL belum disambungkan atau jadual belum dijana. Pastikan DATABASE_URL ditetapkan dalam .env dan jalankan `npx prisma db push`.',
      isConnectionError: true,
    };
  }

  return {
    message: 'Ralat pelayan semasa memproses permintaan pangkalan data.',
    isConnectionError: false,
  };
}
