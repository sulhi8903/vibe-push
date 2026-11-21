import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ALLOWED_ITEMS,
  ALLOWED_SLOTS,
  ALLOWED_STATUSES,
  getTodayIsoDate,
  isValidIsoDate,
} from '@/lib/constants';
import {
  getDatabaseErrorMessage,
  serializeBooking,
  sortBookings,
} from '@/lib/booking-service';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return NextResponse.json(
        { error: 'ID tempahan tidak sah.' },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Format permintaan tidak sah.' },
        { status: 400 }
      );
    }

    const existing = await prisma.booking.findUnique({
      where: { id: cleanId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rekod tempahan tidak dijumpai.' },
        { status: 404 }
      );
    }

    const updateData: {
      namaPemohon?: string;
      itemTempahan?: string;
      tarikh?: string;
      slotMasa?: string;
      status?: string;
    } = {};

    if (body.nama_pemohon !== undefined) {
      const nama = typeof body.nama_pemohon === 'string' ? body.nama_pemohon.trim() : '';
      if (!nama || nama.length > 120) {
        return NextResponse.json(
          { error: 'Nama pemohon wajib diisi (maksimum 120 aksara).' },
          { status: 400 }
        );
      }
      updateData.namaPemohon = nama;
    }

    if (body.item_tempahan !== undefined) {
      const item = typeof body.item_tempahan === 'string' ? body.item_tempahan.trim() : '';
      if (!ALLOWED_ITEMS.includes(item)) {
        return NextResponse.json(
          { error: 'Item tempahan yang dipilih tidak sah.' },
          { status: 400 }
        );
      }
      updateData.itemTempahan = item;
    }

    if (body.tarikh !== undefined) {
      const tarikh = typeof body.tarikh === 'string' ? body.tarikh.trim() : '';
      if (!isValidIsoDate(tarikh)) {
        return NextResponse.json(
          { error: 'Tarikh tempahan tidak sah. Gunakan format YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      updateData.tarikh = tarikh;
    }

    if (body.slot_masa !== undefined) {
      const slot = typeof body.slot_masa === 'string' ? body.slot_masa.trim() : '';
      if (!(ALLOWED_SLOTS as readonly string[]).includes(slot)) {
        return NextResponse.json(
          { error: 'Slot masa yang dipilih tidak sah.' },
          { status: 400 }
        );
      }
      updateData.slotMasa = slot;
    }

    if (body.status !== undefined) {
      const status = typeof body.status === 'string' ? body.status.trim() : '';
      if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json(
          { error: 'Status tempahan tidak sah.' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tiada medan untuk dikemaskini.' },
        { status: 400 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: cleanId },
      data: updateData,
    });

    const rows = await prisma.booking.findMany({
      orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
    });

    const isStatusOnly =
      Object.keys(updateData).length === 1 && updateData.status !== undefined;
    const message = isStatusOnly
      ? updateData.status === 'Diluluskan'
        ? 'Tempahan telah diluluskan.'
        : updateData.status === 'Ditolak'
        ? 'Tempahan telah ditolak.'
        : 'Status tempahan dikemaskini.'
      : 'Maklumat tempahan berjaya dikemaskini.';

    return NextResponse.json({
      booking: serializeBooking(updated),
      bookings: sortBookings(rows.map(serializeBooking)),
      today: getTodayIsoDate(),
      message,
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    const dbErr = getDatabaseErrorMessage(error);
    return NextResponse.json(
      { error: dbErr.message },
      { status: dbErr.isConnectionError ? 503 : 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return NextResponse.json(
        { error: 'ID tempahan tidak sah.' },
        { status: 400 }
      );
    }

    const existing = await prisma.booking.findUnique({
      where: { id: cleanId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rekod tempahan tidak dijumpai.' },
        { status: 404 }
      );
    }

    await prisma.booking.delete({
      where: { id: cleanId },
    });

    const rows = await prisma.booking.findMany({
      orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      bookings: sortBookings(rows.map(serializeBooking)),
      today: getTodayIsoDate(),
      message: 'Rekod tempahan berjaya dipadam.',
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    const dbErr = getDatabaseErrorMessage(error);
    return NextResponse.json(
      { error: dbErr.message },
      { status: dbErr.isConnectionError ? 503 : 500 }
    );
  }
}
