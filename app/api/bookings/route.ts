import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ALLOWED_ITEMS,
  ALLOWED_SLOTS,
  getTodayIsoDate,
  isValidIsoDate,
} from '@/lib/constants';
import {
  getDatabaseErrorMessage,
  serializeBooking,
  sortBookings,
} from '@/lib/booking-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await prisma.booking.findMany({
      orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
    });

    const bookings = sortBookings(rows.map(serializeBooking));
    return NextResponse.json({
      bookings,
      today: getTodayIsoDate(),
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    const dbErr = getDatabaseErrorMessage(error);
    return NextResponse.json(
      {
        error: dbErr.message,
        isConnectionError: dbErr.isConnectionError,
      },
      { status: dbErr.isConnectionError ? 503 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Format permintaan tidak sah.' },
        { status: 400 }
      );
    }

    const namaPemohon =
      typeof body.nama_pemohon === 'string' ? body.nama_pemohon.trim() : '';
    const itemTempahan =
      typeof body.item_tempahan === 'string' ? body.item_tempahan.trim() : '';
    const tarikh = typeof body.tarikh === 'string' ? body.tarikh.trim() : '';
    const slotMasa =
      typeof body.slot_masa === 'string' ? body.slot_masa.trim() : '';

    if (!namaPemohon || namaPemohon.length > 120) {
      return NextResponse.json(
        { error: 'Nama pemohon wajib diisi (maksimum 120 aksara).' },
        { status: 400 }
      );
    }
    if (!ALLOWED_ITEMS.includes(itemTempahan)) {
      return NextResponse.json(
        { error: 'Item tempahan yang dipilih tidak sah.' },
        { status: 400 }
      );
    }
    if (!isValidIsoDate(tarikh)) {
      return NextResponse.json(
        { error: 'Tarikh tempahan tidak sah. Gunakan format YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (!(ALLOWED_SLOTS as readonly string[]).includes(slotMasa)) {
      return NextResponse.json(
        { error: 'Slot masa yang dipilih tidak sah.' },
        { status: 400 }
      );
    }

    const created = await prisma.booking.create({
      data: {
        namaPemohon,
        itemTempahan,
        tarikh,
        slotMasa,
        status: 'Menunggu',
      },
    });

    const rows = await prisma.booking.findMany({
      orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(
      {
        booking: serializeBooking(created),
        bookings: sortBookings(rows.map(serializeBooking)),
        today: getTodayIsoDate(),
        message: 'Tempahan baharu berjaya didaftarkan.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    const dbErr = getDatabaseErrorMessage(error);
    return NextResponse.json(
      { error: dbErr.message },
      { status: dbErr.isConnectionError ? 503 : 500 }
    );
  }
}
