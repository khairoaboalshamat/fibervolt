import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { TOTAL_STACK, calcRepPay } from '@/lib/commissionData';

export default function Reports() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
  });

  const isAdmin = user?.role === 'admin';

  // Count installed deals per rep (for tier calc)
  const repDealCounts = useMemo(() => {
    const counts = {};
    sales.forEach(s => {
      if (s.status === 'installed' && s.rep_email) {
        counts[s.rep_email] = (counts[s.rep_email] || 0) + 1;
      }
    });
    return counts;
  }, [sales]);

  // Group sales by month
  const monthlyData = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      if (!s.sale_date) return;
      const month = format(startOfMonth(parseISO(s.sale_date)), 'MMM yyyy');
      if (!map[month]) map[month] = { month, totalCommissions: 0, repPay: 0, override: 0, pending: 0, deals: 0 };

      const stack = TOTAL_STACK[s.plan] || s.commission_amount || 0;
      const repPay = TOTAL_STACK[s.plan] ? calcRepPay(s.plan, repDealCounts[s.rep_email] || 0) : (s.commission_amount || 0);
      const override = stack - repPay;

      map[month].deals += 1;

      if (s.status === 'installed') {
        map[month].totalCommissions += stack;
        map[month].repPay += repPay;
        map[month].override += override;
      } else if (s.status !== 'cancelled') {
        map[month].pending += stack;
      }
    });

    return Object.values(map).sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [sales, repDealCounts]);

  // Group by plan
  const planData = useMemo(() => {
    const map = {};
    sales.filter(s => s.status === 'installed' && TOTAL_STACK[s.plan]).forEach(s => {
      if (!map[s.plan]) map[s.plan] = { plan: s.plan, deals: 0, totalStack: 0, repPay: 0, override: 0 };
      const stack = TOTAL_STACK[s.plan];
      const repPay = calcRepPay(s.plan, repDealCounts[s.rep_email] || 0);
      map[s.plan].deals += 1;
      map[s.plan].totalStack += stack;
      map[s.plan].repPay += repPay;
      map[s.plan].override += stack - repPay;
    });
    return Object.values(map).sort((a, b) => b.deals - a.deals);
  }, [sales, repDealCounts]);

  // Summary totals
  const totals = useMemo(() => {
    return monthlyData.reduce((acc, m) => ({
      totalCommissions: acc.totalCommissions + m.totalCommissions,
      repPay: acc.repPay + m.repPay,
      override: acc.override + m.override,
      pending: acc.pending + m.pending,
    }), { totalCommissions: 0, repPay: 0, override: 0, pending: 0 });
  }, [monthlyData]);

  if (!isAdmin) {
    return <p className="text-center text-muted-foreground py-12">Admin access required</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" /> Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Monthly breakdown of commissions, overrides, and growth</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Stack (Installed)</p>
          <p className="text-2xl font-bold mt-1">${totals.totalCommissions.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Rep Pay</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">${totals.repPay.toLocaleString()}</p>
        </Card>
        <Card className="p-4 border-accent/20">
          <p className="text-xs text-muted-foreground">Your Override</p>
          <p className="text-2xl font-bold mt-1 text-accent">${totals.override.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pending Pipeline</p>
          <p className="text-2xl font-bold mt-1 text-primary">${totals.pending.toLocaleString()}</p>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="plans">By Plan</TabsTrigger>
          <TabsTrigger value="growth">Growth Trend</TabsTrigger>
        </TabsList>

        {/* Monthly Breakdown */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Commission Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="repPay" name="Rep Pay" fill="hsl(38 92% 50%)" radius={[3,3,0,0]} />
                  <Bar dataKey="override" name="Override" fill="hsl(142 71% 45%)" radius={[3,3,0,0]} />
                  <Bar dataKey="pending" name="Pending" fill="hsl(221 83% 53%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Month</th>
                      <th className="pb-2 font-medium">Deals</th>
                      <th className="pb-2 font-medium">Total Stack</th>
                      <th className="pb-2 font-medium text-amber-500">Rep Pay</th>
                      <th className="pb-2 font-medium text-accent">Override</th>
                      <th className="pb-2 font-medium text-primary">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlyData.map(m => (
                      <tr key={m.month}>
                        <td className="py-2 font-medium">{m.month}</td>
                        <td className="py-2 text-muted-foreground">{m.deals}</td>
                        <td className="py-2 font-semibold">${m.totalCommissions.toLocaleString()}</td>
                        <td className="py-2 text-amber-500">${m.repPay.toLocaleString()}</td>
                        <td className="py-2 text-accent font-semibold">${m.override.toLocaleString()}</td>
                        <td className="py-2 text-primary">${m.pending.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Plan */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance by Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={planData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="repPay" name="Rep Pay" fill="hsl(38 92% 50%)" radius={[3,3,0,0]} />
                  <Bar dataKey="override" name="Override" fill="hsl(142 71% 45%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Plan</th>
                      <th className="pb-2 font-medium">Deals</th>
                      <th className="pb-2 font-medium">Total Stack</th>
                      <th className="pb-2 font-medium text-amber-500">Rep Pay</th>
                      <th className="pb-2 font-medium text-accent">Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {planData.map(p => (
                      <tr key={p.plan}>
                        <td className="py-2 font-bold">{p.plan}</td>
                        <td className="py-2 text-muted-foreground">{p.deals}</td>
                        <td className="py-2 font-semibold">${p.totalStack.toLocaleString()}</td>
                        <td className="py-2 text-amber-500">${p.repPay.toLocaleString()}</td>
                        <td className="py-2 text-accent font-semibold">${p.override.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Trend */}
        <TabsContent value="growth">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Override & Pipeline Growth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="override" name="Override" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="totalCommissions" name="Total Stack" stroke="hsl(221 83% 53%)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="deals" name="Deals" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}