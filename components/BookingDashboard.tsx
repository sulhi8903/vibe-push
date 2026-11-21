'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Clock3,
  Database,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ALLOWED_SLOTS,
  ALLOWED_STATUSES,
  ITEMS_BY_CATEGORY,
  formatDisplayDate,
  getItemCategory,
  getTodayIsoDate,
  type BookingDTO,
  type BookingStatus,
} from '@/lib/constants';

interface BookingDashboardProps {
  initialBookings: BookingDTO[];
  initialToday: string;
  initialDbError?: string | null;
}

type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

type QuickView = 'semua' | 'hari-ini' | 'menunggu';

export default function BookingDashboard({
  initialBookings,
  initialToday,
  initialDbError = null,
}: BookingDashboardProps) {
  const [bookings, setBookings] = useState<BookingDTO[]>(initialBookings);
  const [today, setToday] = useState<string>(initialToday || getTodayIsoDate());
  const [dbError, setDbError] = useState<string | null>(initialDbError);

  const [quickView, setQuickView] = useState<QuickView>('semua');
  const [filterType, setFilterType] = useState<'Semua' | 'Ruang' | 'Peralatan'>('Semua');
  const [filterItem, setFilterItem] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Add / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState<string>('');
  const [formItem, setFormItem] = useState<string>('');
  const [formTarikh, setFormTarikh] = useState<string>(initialToday || getTodayIsoDate());
  const [formSlot, setFormSlot] = useState<string>('');
  const [formStatus, setFormStatus] = useState<BookingStatus>('Menunggu');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<BookingDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (deleteTarget && !isDeleting) setDeleteTarget(null);
        if (isFormOpen && !isSubmitting) setIsFormOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget, isDeleting, isFormOpen, isSubmitting]);

  const itemFilterOptions = useMemo(() => {
    if (filterType === 'Ruang') return [...ITEMS_BY_CATEGORY.Ruang];
    if (filterType === 'Peralatan') return [...ITEMS_BY_CATEGORY.Peralatan];
    return [...ITEMS_BY_CATEGORY.Ruang, ...ITEMS_BY_CATEGORY.Peralatan];
  }, [filterType]);

  const summaryStats = useMemo(() => {
    let todayCount = 0;
    let pendingCount = 0;

    for (const item of bookings) {
      if (item.tarikh === today) todayCount += 1;
      if (item.status === 'Menunggu') pendingCount += 1;
    }

    return {
      todayCount,
      pendingCount,
    };
  }, [bookings, today]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (quickView === 'hari-ini' && booking.tarikh !== today) return false;
      if (quickView === 'menunggu' && booking.status !== 'Menunggu') return false;

      const category = getItemCategory(booking.item_tempahan);
      if (filterType !== 'Semua' && category !== filterType) return false;
      if (filterItem !== 'Semua' && booking.item_tempahan !== filterItem) return false;

      if (query) {
        const haystack =
          `${booking.nama_pemohon} ${booking.item_tempahan} ${booking.id}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [bookings, filterItem, filterType, quickView, searchQuery, today]);

  function handleCategoryFilterChange(nextType: 'Semua' | 'Ruang' | 'Peralatan') {
    setFilterType(nextType);
    if (nextType !== 'Semua') {
      const allowed = ITEMS_BY_CATEGORY[nextType] as readonly string[];
      if (filterItem !== 'Semua' && !allowed.includes(filterItem)) {
        setFilterItem('Semua');
      }
    }
  }

  function resetFilters() {
    setQuickView('semua');
    setFilterType('Semua');
    setFilterItem('Semua');
    setSearchQuery('');
  }

  async function refreshBookings() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings', { cache: 'no-store' });
      const data = (await response.json()) as {
        bookings?: BookingDTO[];
        today?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuatkan data tempahan.');
      }

      setBookings(data.bookings ?? []);
      if (data.today) setToday(data.today);
      setDbError(null);
      setToast({ type: 'success', message: 'Senarai tempahan telah dikemaskini.' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ralat semasa memuatkan data.';
      setToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setFormNama('');
    setFormItem('');
    setFormTarikh(today || getTodayIsoDate());
    setFormSlot('');
    setFormStatus('Menunggu');
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditModal(booking: BookingDTO) {
    setEditingId(booking.id);
    setFormNama(booking.nama_pemohon);
    setFormItem(booking.item_tempahan);
    setFormTarikh(booking.tarikh);
    setFormSlot(booking.slot_masa);
    setFormStatus(booking.status);
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const cleanNama = formNama.trim();
    if (!cleanNama) {
      setFormError('Sila masukkan nama pemohon.');
      return;
    }
    if (!formItem) {
      setFormError('Sila pilih ruang atau peralatan.');
      return;
    }
    if (!formTarikh) {
      setFormError('Sila pilih tarikh tempahan.');
      return;
    }
    if (!formSlot) {
      setFormError('Sila pilih slot masa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/bookings/${editingId}` : '/api/bookings';
      const method = editingId ? 'PATCH' : 'POST';
      const payload = editingId
        ? {
            nama_pemohon: cleanNama,
            item_tempahan: formItem,
            tarikh: formTarikh,
            slot_masa: formSlot,
            status: formStatus,
          }
        : {
            nama_pemohon: cleanNama,
            item_tempahan: formItem,
            tarikh: formTarikh,
            slot_masa: formSlot,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        bookings?: BookingDTO[];
        today?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan rekod tempahan.');
      }

      if (data.bookings) setBookings(data.bookings);
      if (data.today) setToday(data.today);
      setDbError(null);
      setIsFormOpen(false);
      setToast({
        type: 'success',
        message: data.message || 'Tempahan berjaya disimpan.',
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Gagal menyimpan tempahan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickStatus(id: string, nextStatus: 'Diluluskan' | 'Ditolak') {
    setBusyRowId(id);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json()) as {
        bookings?: BookingDTO[];
        today?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengemaskini status.');
      }

      if (data.bookings) setBookings(data.bookings);
      if (data.today) setToday(data.today);
      setDbError(null);
      setToast({
        type: 'success',
        message: data.message || 'Status tempahan dikemaskini.',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Gagal mengemaskini status.',
      });
    } finally {
      setBusyRowId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bookings/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as {
        bookings?: BookingDTO[];
        today?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memadam tempahan.');
      }

      if (data.bookings) setBookings(data.bookings);
      if (data.today) setToday(data.today);
      setDbError(null);
      setDeleteTarget(null);
      setToast({
        type: 'success',
        message: data.message || 'Rekod tempahan berjaya dipadam.',
      });
    } catch (error) {
      setDeleteTarget(null);
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal memadam rekod.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function renderStatusIndicator(status: BookingStatus) {
    if (status === 'Diluluskan') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 whitespace-nowrap">
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Diluluskan
        </span>
      );
    }
    if (status === 'Ditolak') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 whitespace-nowrap">
          <X className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 whitespace-nowrap">
        <Clock3 className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
        Menunggu
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Brand wordmark — Navigation views — Primary action */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#senarai-tempahan"
            onClick={(e) => {
              e.preventDefault();
              setQuickView('semua');
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 sm:text-lg"
          >
            Tempahan Kampus
          </a>

          <nav
            aria-label="Penapis Paparan Pantas"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
          >
            <button
              type="button"
              onClick={() => setQuickView('semua')}
              className={`cursor-pointer border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                quickView === 'semua'
                  ? 'border-blue-600 font-semibold text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Semua Rekod
            </button>
            <button
              type="button"
              onClick={() => setQuickView('hari-ini')}
              className={`cursor-pointer border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                quickView === 'hari-ini'
                  ? 'border-blue-600 font-semibold text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Tempahan Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setQuickView('menunggu')}
              className={`cursor-pointer border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                quickView === 'menunggu'
                  ? 'border-blue-600 font-semibold text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Perlu Kelulusan
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tempahan Baru</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Page Heading & Toolbar */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance sm:text-3xl">
              Sistem Tempahan Ruang &amp; Peralatan
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Urus tempahan bilik perbincangan, makmal komputer, dan peminjaman peralatan kampus secara berpusat.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshBookings}
            disabled={isLoading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Muat Semula</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm font-medium ${
              toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="cursor-pointer rounded p-1 hover:bg-black/5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Database Setup Guidance Banner (shown only if DATABASE_URL / schema is unavailable) */}
        {dbError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">Pangkalan data PostgreSQL belum disambungkan</p>
              <p className="mt-1 text-amber-900">{dbError}</p>
            </div>
          </div>
        )}

        {/* Summary KPI Cards */}
        <section
          aria-label="Ringkasan Tempahan"
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-600">
                Tempahan Hari Ini
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summaryStats.todayCount}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Tarikh hari ini: <span className="font-mono tabular-nums">{formatDisplayDate(today)}</span>
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-600">
                Permohonan Menunggu
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summaryStats.pendingCount}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Permohonan aktif yang memerlukan semakan &amp; kelulusan admin
            </p>
          </article>
        </section>

        {/* Mobile Quick View Tabs */}
        <div className="mb-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 md:hidden">
          <button
            type="button"
            onClick={() => setQuickView('semua')}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              quickView === 'semua'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setQuickView('hari-ini')}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              quickView === 'hari-ini'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => setQuickView('menunggu')}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              quickView === 'menunggu'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Menunggu
          </button>
        </div>

        {/* Main Data Panel */}
        <section
          id="senarai-tempahan"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {/* Filter Toolbar */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-base font-bold text-slate-900">Senarai Tempahan</h2>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                Memaparkan {filteredBookings.length} daripada {bookings.length} rekod tempahan
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="search-applicant"
                  className="text-xs font-semibold text-slate-600"
                >
                  Carian Pemohon
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="search-applicant"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama pemohon..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 lg:w-52"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="filter-type"
                  className="text-xs font-semibold text-slate-600"
                >
                  Kategori
                </label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) =>
                    handleCategoryFilterChange(
                      e.target.value as 'Semua' | 'Ruang' | 'Peralatan'
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                >
                  <option value="Semua">Semua Jenis</option>
                  <option value="Ruang">Ruang</option>
                  <option value="Peralatan">Peralatan</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="filter-item"
                  className="text-xs font-semibold text-slate-600"
                >
                  Item Tempahan
                </label>
                <select
                  id="filter-item"
                  value={filterItem}
                  onChange={(e) => setFilterItem(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                >
                  <option value="Semua">Semua Item</option>
                  {itemFilterOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                Set Semula
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="divide-y divide-slate-200 p-5" aria-busy="true">
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="flex h-[52px] items-center justify-between gap-4 py-3"
                >
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Tiada Rekod Tempahan
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {bookings.length === 0
                  ? 'Belum ada permohonan tempahan direkodkan. Mulakan dengan menambah tempahan pertama.'
                  : 'Tiada tempahan yang sepadan dengan penapis semasa. Cuba set semula penapis.'}
              </p>
              <div className="mt-5 flex items-center gap-3">
                {bookings.length > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Set Semula Penapis
                  </button>
                )}
                <button
                  type="button"
                  onClick={openAddModal}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Tambah Tempahan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Data Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-4 py-3 whitespace-nowrap">ID</th>
                      <th className="px-4 py-3 whitespace-nowrap">Nama Pemohon</th>
                      <th className="px-4 py-3 whitespace-nowrap">Item Tempahan</th>
                      <th className="px-4 py-3 whitespace-nowrap">Tarikh</th>
                      <th className="px-4 py-3 whitespace-nowrap">Slot Masa</th>
                      <th className="px-4 py-3 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">
                        Tindakan Admin &amp; Rekod
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredBookings.map((booking) => {
                      const category = getItemCategory(booking.item_tempahan);
                      const isRowBusy = busyRowId === booking.id;
                      const isApproved = booking.status === 'Diluluskan';
                      const isRejected = booking.status === 'Ditolak';

                      return (
                        <tr
                          key={booking.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            <span title={booking.id}>{booking.id.slice(0, 8)}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {booking.nama_pemohon}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {booking.item_tempahan}
                            </div>
                            <div className="text-xs text-slate-500">{category}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                            {formatDisplayDate(booking.tarikh)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                            {booking.slot_masa}
                          </td>
                          <td className="px-4 py-3">
                            {renderStatusIndicator(booking.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isRowBusy || isApproved}
                                onClick={() =>
                                  handleQuickStatus(booking.id, 'Diluluskan')
                                }
                                className="cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                              >
                                Lulus
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy || isRejected}
                                onClick={() =>
                                  handleQuickStatus(booking.id, 'Ditolak')
                                }
                                className="cursor-pointer rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                              >
                                Tolak
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => openEditModal(booking)}
                                title="Edit tempahan"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => setDeleteTarget(booking)}
                                title="Padam tempahan"
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="divide-y divide-slate-200 md:hidden">
                {filteredBookings.map((booking) => {
                  const category = getItemCategory(booking.item_tempahan);
                  const isRowBusy = busyRowId === booking.id;
                  const isApproved = booking.status === 'Diluluskan';
                  const isRejected = booking.status === 'Ditolak';

                  return (
                    <article key={booking.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {booking.nama_pemohon}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {booking.item_tempahan} <span aria-hidden="true">&middot;</span>{' '}
                            {category}
                          </p>
                        </div>
                        {renderStatusIndicator(booking.status)}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="font-mono tabular-nums">
                          {formatDisplayDate(booking.tarikh)}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-mono tabular-nums">
                          {booking.slot_masa}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          #{booking.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="mt-3.5 grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          disabled={isRowBusy || isApproved}
                          onClick={() =>
                            handleQuickStatus(booking.id, 'Diluluskan')
                          }
                          className="cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40"
                        >
                          Lulus
                        </button>
                        <button
                          type="button"
                          disabled={isRowBusy || isRejected}
                          onClick={() => handleQuickStatus(booking.id, 'Ditolak')}
                          className="cursor-pointer rounded-md border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-800 disabled:opacity-40"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => openEditModal(booking)}
                          className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => setDeleteTarget(booking)}
                          className="cursor-pointer rounded-md border border-rose-200 bg-white px-2 py-2 text-xs font-semibold text-rose-700"
                        >
                          Padam
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Add / Edit Booking Modal */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setIsFormOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3
                id="booking-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {editingId ? 'Kemaskini Tempahan' : 'Tempahan Baru'}
              </h3>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsFormOpen(false)}
                aria-label="Tutup borang"
                className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5" noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="field-nama"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Nama Pemohon <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="field-nama"
                    type="text"
                    required
                    maxLength={120}
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Ahmad Daniel bin Razak"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="field-item"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Item Tempahan <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="field-item"
                    required
                    value={formItem}
                    onChange={(e) => setFormItem(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  >
                    <option value="">-- Pilih Ruang atau Peralatan --</option>
                    <optgroup label="Ruang">
                      {ITEMS_BY_CATEGORY.Ruang.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Peralatan">
                      {ITEMS_BY_CATEGORY.Peralatan.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="field-tarikh"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Tarikh <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="field-tarikh"
                      type="date"
                      required
                      value={formTarikh}
                      onChange={(e) => setFormTarikh(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="field-slot"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Slot Masa <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="field-slot"
                      required
                      value={formSlot}
                      onChange={(e) => setFormSlot(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                    >
                      <option value="">-- Pilih Slot --</option>
                      {ALLOWED_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editingId && (
                  <div>
                    <label
                      htmlFor="field-status"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Status
                    </label>
                    <select
                      id="field-status"
                      value={formStatus}
                      onChange={(e) =>
                        setFormStatus(e.target.value as BookingStatus)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                    >
                      {ALLOWED_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                    {formError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingId
                    ? 'Simpan Perubahan'
                    : 'Simpan Tempahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3
                id="delete-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Sahkan Pemadaman
              </h3>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                aria-label="Tutup dialog"
                className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-600">
                Adakah anda pasti mahu memadam rekod tempahan ini? Tindakan ini tidak boleh dikembalikan.
              </p>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
                <div className="font-semibold text-slate-900">
                  {deleteTarget.nama_pemohon}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {deleteTarget.item_tempahan} <span aria-hidden="true">&middot;</span>{' '}
                  <span className="font-mono tabular-nums">
                    {formatDisplayDate(deleteTarget.tarikh)}
                  </span>{' '}
                  ({deleteTarget.slot_masa})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Memadam...' : 'Ya, Padam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
