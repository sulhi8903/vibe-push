import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sistem Tempahan Ruang & Peralatan',
  description:
    'Resource Booking System for campus rooms and equipment built with Next.js 15 App Router, Tailwind CSS v4, and Prisma v6.',
  openGraph: {
    title: 'Sistem Tempahan Ruang & Peralatan',
    description:
      'Resource Booking System for campus rooms and equipment built with Next.js 15 App Router, Tailwind CSS v4, and Prisma v6.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistem Tempahan Ruang & Peralatan',
    description:
      'Resource Booking System for campus rooms and equipment built with Next.js 15 App Router, Tailwind CSS v4, and Prisma v6.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ms"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

