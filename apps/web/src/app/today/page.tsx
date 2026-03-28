import Link from 'next/link';
import { TodayDateShell } from './TodayDateShell';

export default function TodayPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-1">Today</h1>
        <TodayDateShell />
      </div>
    </main>
  );
}
