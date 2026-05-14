import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart2, Download, Filter } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TOTAL_STACK, calcRepPay, calcAdminPay } from '@/lib/commissionData';

export default function Reports() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list(),
  });

  const isAdmin = user?.role === 'admin';

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [repFilter, setRepFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const allPlans = useMemo(() => [...new Set(sales.map(s => s.plan).filter(Boolean))], [sales]);
  const allReps = useMemo(() => {
    const map = {};
    sales.forEach(s => { if (s.rep_email) map[s.rep_email] = s.rep_name || s.rep_email; });
    return Object.entries(map).map(([email, name]) => ({ email, name }));
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (repFilter !== 'all' && s.rep_email !== repFilter) return false;
      if (planFilter !== 'all' && s.plan !== planFilter) return false;
      if (dateFrom || dateTo) {
        if (!s.sale_date) return false;
        const d = parseISO(s.sale_date);
        if (dateFrom && d < startOfDay(parseISO(dateFrom))) return false;
        if (dateTo && d > endOfDay(parseISO(dateTo))) return false;
      }
      return true;
    });
  }, [sales, repFilter, planFilter, dateFrom, dateTo]);

  const rows = useMemo(() => {
    return filteredSales.map(s => {
      const stack = TOTAL_STACK[s.plan] || s.commission_amount || 0;
      const repUser = users.find(u => u.email === s.rep_email);
      const isRepAdmin = repUser?.role === 'admin';
      const tierRecord = repTiers.find(t => t.rep_email === s.rep_email);
      const tier = tierRecord?.tier ?? 0;
      const repPay = TOTAL_STACK[s.plan]
        ? (isRepAdmin ? calcAdminPay(s.plan) : calcRepPay(s.plan, tier))
        : (s.commission_amount || 0);
      const override = isRepAdmin ? 0 : stack - repPay;
      return { ...s, stack, repPay, override };
    });
  }, [filteredSales, repTiers, users]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    stack: acc.stack + (r.status === 'installed' ? r.stack : 0),
    repPay: acc.repPay + (r.status === 'installed' ? r.repPay : 0),
    override: acc.override + (r.status === 'installed' ? r.override : 0),
    commission: acc.commission + (r.commission_amount || 0),
  }), { stack: 0, repPay: 0, override: 0, commission: 0 }), [rows]);

  const downloadCSV = () => {
    const headers = ['Customer', 'Rep', 'Plan', 'Add-Ons', 'Sale Date', 'Install Date', 'Status', 'Monthly Bill', 'Commission', 'Rep Pay', 'Override', 'Paid'];
    const csvRows = rows.map(r => [
      r.customer_name || '',
      r.rep_name || r.rep_email || '',
      r.plan || '',
      (r.add_ons || []).join('; '),
      r.sale_date || '',
      r.install_date || '',
      r.status || '',
      (r.monthly_bill || 0).toFixed(2),
      (r.commission_amount || 0).toFixed(2),
      r.repPay.toFixed(2),
      r.override.toFixed(2),
      r.paid ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...csvRows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setRepFilter('all'); setPlanFilter('all'); };

  if (!isAdmin) {
    return <p className="text-center text-muted-foreground py-12">Admin access required</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" /> Commission Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Filter and export commission earnings</p>
        </div>
        <Button onClick={downloadCSV} className="gap-2">
          <Download className="h-4 w-4" /> Download CSV ({rows.length} rows)
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sales Rep</Label>
              <Select value={repFilter} onValueChange={setRepFilter}>
                <SelectTrigger><SelectValue placeholder="All Reps" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reps</SelectItem>
                  {allReps.map(r => <SelectItem key={r.email} value={r.email}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger><SelectValue placeholder="All Plans" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {allPlans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(dateFrom || dateTo || repFilter !== 'all' || planFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Stack (Installed)</p>
          <p className="text-2xl font-bold mt-1">${totals.stack.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Rep Pay</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">${totals.repPay.toLocaleString()}</p>
        </Card>
        <Card className="p-4 border-accent/20">
          <p className="text-xs text-muted-foreground">Your Override</p>
          <p className="text-2xl font-bold mt-1 text-accent">${totals.override.toLocaleString()}</p>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sale Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Rep</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Sale Date</th>
                  <th className="px-4 py-3 font-medium">Install Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-amber-500">Rep Pay</th>
                  <th className="px-4 py-3 font-medium text-accent">Override</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-muted-foreground py-10">No results match your filters</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.rep_name || r.rep_email}</td>
                    <td className="px-4 py-3">{r.plan}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.sale_date ? format(parseISO(r.sale_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.install_date ? format(parseISO(r.install_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 capitalize">{r.status}</td>
                    <td className="px-4 py-3 text-amber-500 font-semibold">${r.repPay.toFixed(2)}</td>
                    <td className="px-4 py-3 text-accent font-semibold">${r.override.toFixed(2)}</td>
                    <td className="px-4 py-3">{r.paid ? <span className="text-accent">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}