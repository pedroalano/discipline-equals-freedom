import { cookies } from 'next/headers';
import Link from 'next/link';
import type { FocusItemListResponse } from '@zenfocus/types';
import { DailyList } from './DailyList';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year!, month! - 1, day!);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

async function getFocusItems(date: string): Promise<FocusItemListResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const res = await fetch(`${API_URL}/focus?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { items: [], total: 0, completed: 0 };
  const raw = (await res.json()) as unknown;
  // Normalize: backend may still return a bare array if migration hasn't run yet
  if (Array.isArray(raw)) {
    const arr = raw as FocusItemListResponse['items'];
    return { items: arr, total: arr.length, completed: arr.filter((i) => i.completed).length };
  }
  const obj = raw as FocusItemListResponse;
  if (!Array.isArray(obj.items)) return { items: [], total: 0, completed: 0 };
  return obj;
}

export default async function TodayPage() {
  const date = todayISO();
  const initialData = await getFocusItems(date);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-1">Today</h1>
        <p className="text-white/50 mb-8 text-sm">{formatDate(date)}</p>

        <DailyList date={date} initialData={initialData} />
      </div>
    </main>
  );
}
