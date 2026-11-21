import { prisma } from '../lib/prisma';

function formatOffsetDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function main() {
  const existingCount = await prisma.booking.count();
  if (existingCount > 0) {
    console.log(`Seed skipped: ${existingCount} booking records already exist.`);
    return;
  }

  const initialBookings = [
    {
      namaPemohon: 'Ahmad Daniel bin Razak',
      itemTempahan: 'Bilik Perbincangan 1',
      tarikh: formatOffsetDate(0),
      slotMasa: '8:00-10:00',
      status: 'Diluluskan',
    },
    {
      namaPemohon: 'Nurul Aisyah binti Ismail',
      itemTempahan: 'Makmal Komputer 1',
      tarikh: formatOffsetDate(0),
      slotMasa: '10:00-12:00',
      status: 'Menunggu',
    },
    {
      namaPemohon: 'Muhammad Hafizuddin bin Zulkifli',
      itemTempahan: 'Kamera DSLR',
      tarikh: formatOffsetDate(0),
      slotMasa: '14:00-16:00',
      status: 'Menunggu',
    },
    {
      namaPemohon: 'Siti Sarah binti Abdullah',
      itemTempahan: 'Bilik Perbincangan 2',
      tarikh: formatOffsetDate(1),
      slotMasa: '8:00-10:00',
      status: 'Diluluskan',
    },
    {
      namaPemohon: 'Tan Wei Ming',
      itemTempahan: 'Makmal Komputer 2',
      tarikh: formatOffsetDate(1),
      slotMasa: '14:00-16:00',
      status: 'Menunggu',
    },
    {
      namaPemohon: 'Priya a/p Subramaniam',
      itemTempahan: 'Tripod',
      tarikh: formatOffsetDate(2),
      slotMasa: '10:00-12:00',
      status: 'Ditolak',
    },
    {
      namaPemohon: 'Mohd Syafiq bin Roslan',
      itemTempahan: 'Bola Futsal',
      tarikh: formatOffsetDate(2),
      slotMasa: '16:00-18:00',
      status: 'Diluluskan',
    },
    {
      namaPemohon: 'Farah Nabila binti Mohd Nor',
      itemTempahan: 'Raket Badminton',
      tarikh: formatOffsetDate(3),
      slotMasa: '16:00-18:00',
      status: 'Menunggu',
    },
    {
      namaPemohon: 'Lim Jia Hui',
      itemTempahan: 'Kamera DSLR',
      tarikh: formatOffsetDate(-1),
      slotMasa: '8:00-10:00',
      status: 'Diluluskan',
    },
  ];

  await prisma.booking.createMany({
    data: initialBookings,
  });

  console.log(`Seeded ${initialBookings.length} booking records successfully.`);
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
