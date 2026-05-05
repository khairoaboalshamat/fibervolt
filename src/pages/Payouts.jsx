import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import SaleRow from '@/components/dashboard/SaleRow';

export default function Payouts() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: () => base44.entities.CommissionRate.list(),
  });

  const { data: boosts = [] } = useQuery({
    queryKey: ['boosts'],
    queryFn: () => base44.entities.RepBoost.list(),
  });

  const mySales = isAdmin ? sales : sales.filter(s => s.rep_email === user?.email);

  const pipeline = mySales.filter(s => ['pending', 'scheduled'].includes(s.status));
  const awaiting = mySales.filter(s => s.status === 'installed' && !s.paid);
  const paid = mySales.filter(s => s.paid);

  const pipelineTotal = pipeline.reduce((s, x) => s + (x.commission_amount || 0), 0);
  const awaitingTotal = awaiting.reduce((s, x) => s + (x.commission_amount || 0), 0);
  const paidTotal = paid.reduce((s, x) => s + (x.commission_amount || 0), 0);

  const plans = rates.filter(r => r.type === 'plan');
  const addons = rates.filter(r => r.type === 'addon');
  const myBoosts = boosts.filter(b => b.rep_email === user?.email);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pipeline" value={`$${pipelineTotal.toLocaleString()}`} icon={TrendingUp} accent="blue" />
        <StatCard label="Awaiting Payout" value={`$${awaitingTotal.toLocaleString()}`} icon={Clock} accent="amber" />
        <StatCard label="Paid" value={`$${paidTotal.toLocaleString()}`} icon={CheckCircle2} accent="green" />
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline ({pipeline.length})</TabsTrigger>
          <TabsTrigger value="awaiting">Awaiting ({awaiting.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          <TabsTrigger value="rates">My Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card>
            <CardContent className="pt-4">
              {pipeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No pipeline sales</p>
              ) : (
                <div className="divide-y divide-border">{pipeline.map(s => <SaleRow key={s.id} sale={s} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awaiting">
          <Card>
            <CardContent className="pt-4">
              {awaiting.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No sales awaiting payout</p>
              ) : (
                <div className="divide-y divide-border">{awaiting.map(s => <SaleRow key={s.id} sale={s} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="pt-4">
              {paid.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No paid sales</p>
              ) : (
                <div className="divide-y divide-border">{paid.map(s => <SaleRow key={s.id} sale={s} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Commission Rate Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-semibold mb-2">Plans</h4>
              <div className="space-y-1 mb-4">
                {plans.map(p => {
                  const boost = myBoosts.find(b => b.plan === p.name);
                  return (
                    <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">${p.commission}</span>
                        {boost && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">
                            +${boost.boost_amount} boost
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <h4 className="text-sm font-semibold mb-2">Add-Ons</h4>
              <div className="space-y-1">
                {addons.map(a => (
                  <div key={a.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-sm font-bold">${a.commission}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}