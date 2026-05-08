import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = [
  'hsl(221,83%,53%)',
  'hsl(142,71%,45%)',
  'hsl(38,92%,50%)',
  'hsl(280,65%,60%)',
  'hsl(0,84%,60%)',
];

export default function PlanBreakdownChart({ sales }) {
  const data = useMemo(() => {
    const counts = {};
    sales.forEach(s => {
      if (!s.plan || s.status === 'cancelled') return;
      counts[s.plan] = (counts[s.plan] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
  }, [sales]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Sales by Plan</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,18%)" vertical={false} />
              <XAxis dataKey="plan" tick={{ fontSize: 12, fill: 'hsl(215,16%,47%)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215,16%,47%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(222,47%,9%)', border: '1px solid hsl(222,40%,18%)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(215,20%,85%)' }}
                cursor={{ fill: 'hsl(222,40%,15%)' }}
              />
              <Bar dataKey="count" name="Sales" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}