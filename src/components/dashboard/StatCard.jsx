import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ label, value, icon: Icon, accent }) {
  const accentClasses = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-accent/10 text-accent',
    amber: 'bg-amber-500/10 text-amber-500',
    rose: 'bg-rose-500/10 text-rose-500',
  };

  return (
    <Card className="p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`rounded-xl p-3 ${accentClasses[accent] || accentClasses.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight mt-0.5">{value}</p>
      </div>
    </Card>
  );
}