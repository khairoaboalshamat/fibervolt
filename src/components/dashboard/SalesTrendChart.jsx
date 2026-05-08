import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { subDays, format, parseISO, startOfDay } from 'date-fns';

export default function SalesTrendChart({ sales }) {
  const data = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return { date: format(date, 'MMM d'), key: format(date, 'yyyy-MM-dd'), sales: 0, commission: 0 };
    });

    sales.forEach(s => {
      if (!s.sale_date) return;
      const key = s.sale_date.split('T')[0];
      const entry = last30.find(d => d.key === key);
      if (entry) {
        entry.sales += 1;
        entry.commission += s.commission_amount || 0;
      }
    });

    return last30;
  }, [sales]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Sales Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221,83%,53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215,16%,47%)' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215,16%,47%)' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,40%,18%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(215,20%,85%)' }}
            />
            <Area type="monotone" dataKey="sales" name="Sales" stroke="hsl(221,83%,53%)" strokeWidth={2} fill="url(#colorSales)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}