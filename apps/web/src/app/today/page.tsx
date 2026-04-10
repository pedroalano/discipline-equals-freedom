import { PageShell } from '@/components/PageShell';
import { TodayDateShell } from './TodayDateShell';

export default function TodayPage() {
  return (
    <PageShell backHref="/" backLabel="Dashboard" title="Today">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <TodayDateShell />
      </div>
    </PageShell>
  );
}
