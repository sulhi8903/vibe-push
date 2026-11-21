import { prisma } from '@/lib/prisma';
import { getTodayIsoDate, type BookingDTO } from '@/lib/constants';
import {
  getDatabaseErrorMessage,
  serializeBooking,
  sortBookings,
} from '@/lib/booking-service';
import BookingDashboard from '@/components/BookingDashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const today = getTodayIsoDate();
  let initialBookings: BookingDTO[] = [];
  let initialDbError: string | null = null;

  try {
    const rows = await prisma.booking.findMany({
      orderBy: [{ tarikh: 'desc' }, { createdAt: 'desc' }],
    });
    initialBookings = sortBookings(rows.map(serializeBooking));
  } catch (error) {
    console.error('HomePage Prisma query error:', error);
    initialDbError = getDatabaseErrorMessage(error).message;
  }

  return (
    <BookingDashboard
      initialBookings={initialBookings}
      initialToday={today}
      initialDbError={initialDbError}
    />
  );
}
