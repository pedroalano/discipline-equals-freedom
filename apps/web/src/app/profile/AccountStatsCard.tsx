'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProfileResponse } from '@zenfocus/types';

interface Props {
  stats: ProfileResponse['stats'];
}

export function AccountStatsCard({ stats }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">Stats</h2>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Focus Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.focusItemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.boardCount}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
