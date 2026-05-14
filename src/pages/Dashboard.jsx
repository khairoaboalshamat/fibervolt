import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, CheckCircle2, CalendarDays, Calendar, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/dashboard/StatCard';
import SaleRow from '@/components/dashboard/SaleRow';
import AdminOverviewCard from '@/components/dashboard/AdminOverviewCard';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import PlanBreakdownChart from '@/components/dashboard/PlanBreakdownChart';
import StatusBreakdown from '@/components/dashboard/StatusBreakdown';
import LiveActivityDashboard from '@/components/dashboard/LiveActivityDashboard';
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TOTAL_STACK, calcAdminPay, calcRepPay } from '@/lib/commissionData';

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list(),
    enabled: isAdmin,
  });

  const mySales = isAdmin ? sales : sales.filter(s => s.rep_email === user?.email);

  // For admin viewers: compute per-rep correct pay (admin-rep = TOTAL_STACK, regular rep = calcRepPay)
  // For rep viewers: use their saved commission_amount
  const getSaleValue = (s) => {
    if (!isAdmin) return s.commission_amount || 0;
    if (!TOTAL_STACK[s.plan]) return s.commission_amount || 0;
    const repUser = users.find(u => u.email === s.rep_email);
    const isRepAdmin = repUser?.role === 'admin';
    if (isRepAdmin) return calcAdminPay(s.plan);
    const tier = repTiers.find(t => t.rep_email === s.rep_email)?.tier ?? 0;
    return calcRepPay(s.plan, tier);
  };

  const pipeline = mySales.filter(s => s.status !== 'cancelled')
    .reduce((sum, s) => sum + getSaleValue(s), 0);
  const earned = mySales.filter(s => s.status === 'installed')
    .reduce((sum, s) => sum + getSaleValue(s), 0);
  const awaiting = mySales.filter(s => s.status === 'installed' && !s.paid)
    .reduce((sum, s) => sum + getSaleValue(s), 0);
  const paidOut = mySales.filter(s => s.paid)
    .reduce((sum, s) => sum + getSaleValue(s), 0);

  const now = new Date();
  const weekEnd = addDays(now, 7);
  const upcoming = mySales.filter(s => {
    if (!s.install_date || s.status === 'cancelled') return false;
    const d = new Date(s.install_date);
    return isWithinInterval(d, { start: startOfDay(now), end: endOfDay(weekEnd) });
  });

  const recent = mySales.slice(0, 8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {user?.full_name || 'Rep'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pipeline" value={`$${pipeline.toLocaleString()}`} icon={TrendingUp} accent="blue" />
        <StatCard label="Earned" value={`$${earned.toLocaleString()}`} icon={DollarSign} accent="green" />
        <StatCard label="Awaiting Payout" value={`$${awaiting.toLocaleString()}`} icon={Clock} accent="amber" />
        <StatCard label="Paid Out" value={`$${paidOut.toLocaleString()}`} icon={CheckCircle2} accent="rose" />
      </div>

      {isAdmin && (
        <AdminOverviewCard sales={sales} users={users} repTiers={repTiers} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/calendar" className="group">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-24 flex items-center">
            <CardContent className="flex items-center justify-between w-full pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">Calendar</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/clients" className="group">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-24 flex items-center">
            <CardContent className="flex items-center justify-between w-full pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Clients</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/payouts" className="group">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-24 flex items-center">
            <CardContent className="flex items-center justify-between w-full pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium">Payouts</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesTrendChart sales={mySales} />
        </div>
        <StatusBreakdown sales={mySales} />
      </div>

      <PlanBreakdownChart sales={mySales} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveActivityDashboard maxItems={20} />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Upcoming Installs (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming installs</p>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map(s => <SaleRow key={s.id} sale={s} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sales yet</p>
          ) : (
            <div className="divide-y divide-border">
              {recent.map(s => <SaleRow key={s.id} sale={s} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}