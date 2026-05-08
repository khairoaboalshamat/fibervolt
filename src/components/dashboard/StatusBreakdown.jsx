import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-500' },
  scheduled: { label: 'Scheduled', color: 'bg-primary' },
  installed: { label: 'Installed', color: 'bg-accent' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive' },
};

export default function StatusBreakdown({ sales }) {
  const stats = useMemo(() => {
    const counts = { pending: 0, scheduled: 0, installed: 0, cancelled: 0 };
    sales.forEach(s => { if (s.status && counts[s.status] !== undefined) counts[s.status]++; });
    const total = sales.length || 1;
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100),
      ...STATUS_CONFIG[status],
    }));
  }, [sales]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {stats.map(({ status, label, count, pct, color }) => (
          <div key={status}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{count} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}