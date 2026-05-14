import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, MapPin, DollarSign, TrendingUp, Users } from 'lucide-react';
import { format, subDays, isAfter, startOfDay } from 'date-fns';
import { PIN_STATUSES } from '@/components/maps/PinStatusBadge';

const PERIODS = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

export default function RepReports() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const [period, setPeriod] = useState('7');
  const [filterRep, setFilterRep] = useState('all');

  const { data: pins = [] } = useQuery({
    queryKey: ['pins'],
    queryFn: () => base44.entities.MapPin.list('-created_date', 2000),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const cutoff = startOfDay(subDays(new Date(), parseInt(period) - 1));

  const repSummaries = useMemo(() => {
    // Determine which reps to show
    let repList;
    if (isAdmin) {
      const repEmailsFromPins = [...new Set(pins.map(p => p.rep_email).filter(Boolean))];
      const repEmailsFromSales = [...new Set(sales.map(s => s.rep_email).filter(Boolean))];
      repList = [...new Set([...repEmailsFromPins, ...repEmailsFromSales])];
    } else {
      repList = [user?.email];
    }

    return repList
      .filter(email => email && (filterRep === 'all' || filterRep === email))
      .map(email => {
        const repUser = users.find(u => u.email === email);
        const name = repUser?.full_name || email;

        const periodPins = pins.filter(p =>
          p.rep_email === email && p.created_date && isAfter(new Date(p.created_date), cutoff)
        );
        const periodSales = sales.filter(s =>
          s.rep_email === email && s.created_date && isAfter(new Date(s.created_date), cutoff)
        );

        const statusBreakdown = PIN_STATUSES.reduce((acc, s) => {
          acc[s.value] = periodPins.filter(p => p.status === s.value).length;
          return acc;
        }, {});

        const conversions = periodPins.filter(p => ['sale', 'installed'].includes(p.status)).length;
        const knocked = periodPins.filter(p => p.status !== 'lead').length;
        const convRate = knocked > 0 ? ((conversions / knocked) * 100).toFixed(1) : '0.0';
        const commissionEarned = periodSales
          .filter(s => s.status !== 'cancelled')
          .reduce((sum, s) => sum + (s.commission_amount || 0), 0);

        const followUps = periodPins.filter(p => p.status === 'follow_up' || p.status === 'callback').length;

        return { email, name, periodPins, periodSales, statusBreakdown, conversions, knocked, convRate, commissionEarned, followUps };
      })
      .sort((a, b) => b.periodSales.length - a.periodSales.length);
  }, [pins, sales, users, isAdmin, user, period, filterRep, cutoff]);

  const repEmails = isAdmin ? [...new Set(pins.map(p => p.rep_email).filter(Boolean))] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Rep Reports
          </h1>
          <p className="text-muted-foreground text-sm">Performance summaries per representative.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Reps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {repEmails.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {repSummaries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No data for selected period.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {repSummaries.map(rep => (
            <Card key={rep.email} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold truncate">{rep.name}</CardTitle>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">{rep.periodSales.length} sales</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{rep.email}</p>
              </CardHeader>
              <CardContent className="pt-0 flex-1 space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
                    <p className="text-xl font-bold">{rep.periodPins.length}</p>
                    <p className="text-xs text-muted-foreground">Pins Dropped</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1"><TrendingUp className="h-4 w-4 text-muted-foreground" /></div>
                    <p className="text-xl font-bold">{rep.convRate}%</p>
                    <p className="text-xs text-muted-foreground">Conv. Rate</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
                    <p className="text-xl font-bold">${rep.commissionEarned.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Commission</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="flex justify-center mb-1"><Users className="h-4 w-4 text-muted-foreground" /></div>
                    <p className="text-xl font-bold">{rep.followUps}</p>
                    <p className="text-xs text-muted-foreground">Follow-ups</p>
                  </div>
                </div>

                {/* Status breakdown */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Pin Status Breakdown</p>
                  <div className="flex flex-wrap gap-1">
                    {PIN_STATUSES.filter(s => (rep.statusBreakdown[s.value] || 0) > 0).map(s => (
                      <span
                        key={s.value}
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ background: s.color }}
                      >
                        {s.label}: {rep.statusBreakdown[s.value]}
                      </span>
                    ))}
                    {PIN_STATUSES.every(s => !rep.statusBreakdown[s.value]) && (
                      <span className="text-xs text-muted-foreground">No pins this period</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}