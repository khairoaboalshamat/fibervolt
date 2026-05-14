import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, ShoppingCart, Wrench } from 'lucide-react';
import { startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { calcRepPay, calcAdminPay, TOTAL_STACK } from '@/lib/commissionData';

export default function Leaderboard() {
  const [period, setPeriod] = useState('month');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 1000),
  });

  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const cutoff = useMemo(() => {
    if (period === 'all') return null;
    return period === 'week' ? startOfWeek(new Date()) : startOfMonth(new Date());
  }, [period]);

  // All non-cancelled sales in period (for sales count)
  const filteredSales = useMemo(() => {
    const active = sales.filter(s => s.status !== 'cancelled');
    if (!cutoff) return active;
    return active.filter(s => isAfter(new Date(s.sale_date || s.created_date), cutoff));
  }, [sales, cutoff]);

  // Installed in period (for installs count)
  const filteredInstalls = useMemo(() => {
    const installed = sales.filter(s => s.status === 'installed');
    if (!cutoff) return installed;
    return installed.filter(s => isAfter(new Date(s.install_date || s.sale_date), cutoff));
  }, [sales, cutoff]);

  const rankings = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const key = s.rep_email;
      if (!map[key]) map[key] = { email: key, name: s.rep_name || key, sales: 0, installs: 0, commission: 0 };
      map[key].sales++;
      const repUser = users.find(u => u.email === s.rep_email);
      const isRepAdmin = repUser?.role === 'admin' || (s.rep_email === user?.email && user?.role === 'admin');
      const tierRecord = repTiers.find(t => t.rep_email === s.rep_email);
      const tier = tierRecord?.tier ?? 0;
      const basePay = TOTAL_STACK[s.plan]
        ? (isRepAdmin ? calcAdminPay(s.plan) : calcRepPay(s.plan, tier))
        : (s.commission_amount || 0);
      const repPay = isRepAdmin ? Math.round(basePay * 0.8) : basePay;
      map[key].commission += repPay;
    });
    filteredInstalls.forEach(s => {
      const key = s.rep_email;
      if (!map[key]) map[key] = { email: key, name: s.rep_name || key, sales: 0, installs: 0, commission: 0 };
      map[key].installs++;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [filteredSales, filteredInstalls, repTiers, users, user]);

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
            <Card key={rep.email} className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${podiumColors[idx]} opacity-10 rounded-bl-full`} />
              <CardContent className="pt-6 text-center">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${podiumColors[idx]} flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-white font-bold text-lg">#{idx + 1}</span>
                </div>
                <p className="font-bold text-lg">{rep.name}</p>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-primary">{rep.sales}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      <ShoppingCart className="h-3 w-3" /> Sales
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-accent">{rep.installs}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      <Wrench className="h-3 w-3" /> Installs
                    </p>
                  </div>
                </div>
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
            <p className="text-sm text-muted-foreground py-6 text-center">No sales in this period</p>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-center px-3 pb-2 text-xs text-muted-foreground font-medium border-b">
                <span className="w-6 text-right mr-3">#</span>
                <span className="flex-1">Rep</span>
                <span className="w-20 text-center flex items-center gap-1 justify-center">
                  <ShoppingCart className="h-3 w-3" /> Sales
                </span>
                <span className="w-20 text-center flex items-center gap-1 justify-center">
                  <Wrench className="h-3 w-3" /> Installs
                </span>
              </div>
              {rankings.map((rep, idx) => (
                <div key={rep.email} className="flex items-center py-3 px-3 rounded-lg hover:bg-muted/50">
                  <span className="text-sm font-bold text-muted-foreground w-6 text-right mr-3">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rep.name}</p>
                    {(user?.role === 'admin' || rep.email === user?.email) && (
                      <p className="text-xs text-muted-foreground">${rep.commission.toLocaleString()} commission</p>
                    )}
                  </div>
                  <span className="w-20 text-center font-bold text-primary">{rep.sales}</span>
                  <span className="w-20 text-center font-bold text-accent">{rep.installs}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}