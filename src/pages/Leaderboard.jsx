import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal } from 'lucide-react';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';

export default function Leaderboard() {
  const [period, setPeriod] = useState('month');

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000),
  });

  const installed = sales.filter(s => s.status === 'installed');

  const filtered = useMemo(() => {
    if (period === 'all') return installed;
    const cutoff = period === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date());
    return installed.filter(s => isAfter(new Date(s.install_date || s.sale_date), cutoff));
  }, [installed, period]);

  const rankings = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const key = s.rep_email;
      if (!map[key]) map[key] = { email: key, name: s.rep_name || key, deals: 0, commission: 0 };
      map[key].deals++;
      map[key].commission += s.commission_amount || 0;
    });
    return Object.values(map).sort((a, b) => b.commission - a.commission);
  }, [filtered]);

  const podiumColors = [
    'from-amber-400 to-amber-600',
    'from-slate-300 to-slate-500',
    'from-orange-400 to-orange-600',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Leaderboard
        </h1>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {rankings.length >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {rankings.slice(0, 3).map((rep, idx) => (
            <Card key={rep.email} className={`relative overflow-hidden ${idx === 0 ? 'sm:col-span-1 sm:row-span-1' : ''}`}>
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${podiumColors[idx]} opacity-10 rounded-bl-full`} />
              <CardContent className="pt-6 text-center">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${podiumColors[idx]} flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-white font-bold text-lg">#{idx + 1}</span>
                </div>
                <p className="font-bold text-lg">{rep.name}</p>
                <p className="text-2xl font-extrabold text-accent mt-1">${rep.commission.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{rep.deals} deal{rep.deals !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Full Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No installed deals in this period</p>
          ) : (
            <div className="space-y-1">
              {rankings.map((rep, idx) => (
                <div key={rep.email} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-right">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">{rep.deals} deal{rep.deals !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="font-bold">${rep.commission.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}