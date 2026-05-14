import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import SaleRow from '@/components/dashboard/SaleRow';
import { TOTAL_STACK, calcRepPay, calcAdminPay, calcAdminOverride } from '@/lib/commissionData';

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

  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const mySales = isAdmin ? sales : sales.filter(s => s.rep_email === user?.email);

  // For admin viewers: compute correct pay per rep (admin-rep = TOTAL_STACK, regular rep = calcRepPay with tier)
  // For rep viewers: use their saved commission_amount
  const getSaleValue = (s) => {
    if (!isAdmin) return s.commission_amount || 0;
    if (!TOTAL_STACK[s.plan]) return s.commission_amount || 0;
    const repUser = users.find(u => u.email === s.rep_email);
    const repIsAdmin = repUser?.role === 'admin';
    if (repIsAdmin) return calcAdminPay(s.plan);
    const tier = repTiers.find(t => t.rep_email === s.rep_email)?.tier ?? 0;
    return calcRepPay(s.plan, tier);
  };

  const getRepTier = (email) => repTiers.find(t => t.rep_email === email)?.tier || 0;
  const isRepAdmin = (email) => users.find(u => u.email === email)?.role === 'admin';

  const pipeline = mySales.filter(s => ['pending', 'scheduled'].includes(s.status));
  const awaiting = mySales.filter(s => s.status === 'installed' && !s.paid);
  const paid = mySales.filter(s => s.paid);

  const getAdminSaleValue = (s) => getSaleValue(s);

  const pipelineTotal = pipeline.reduce((sum, x) => sum + getSaleValue(x), 0);
  // For admins: awaiting shows 80% immediate + 20% deferred (3 months)
  const awaitingImmediate = isAdmin
    ? awaiting.reduce((sum, x) => sum + Math.round(getAdminSaleValue(x) * 0.8), 0)
    : awaiting.reduce((sum, x) => sum + getSaleValue(x), 0);
  const awaitingDeferred = isAdmin
    ? awaiting.reduce((sum, x) => sum + Math.round(getAdminSaleValue(x) * 0.2), 0)
    : 0;
  const awaitingTotal = awaitingImmediate + awaitingDeferred;
  const paidTotal = isAdmin
    ? paid.reduce((sum, x) => sum + Math.round(getSaleValue(x) * 0.8), 0)
    : paid.reduce((sum, x) => sum + getSaleValue(x), 0);

  const plans = rates.filter(r => r.type === 'plan');
  const addons = rates.filter(r => r.type === 'addon');
  const myBoosts = boosts.filter(b => b.rep_email === user?.email);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pipeline" value={`$${pipelineTotal.toLocaleString()}`} icon={TrendingUp} accent="blue" />
        {isAdmin ? (
          <div className="rounded-xl border bg-card shadow p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">Awaiting Payout</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-bold">${awaitingImmediate.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">80% — immediate</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-amber-500">${awaitingDeferred.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">20% — in 3 months</p>
              </div>
            </div>
          </div>
        ) : (
          <StatCard label="Awaiting Payout" value={`$${awaitingTotal.toLocaleString()}`} icon={Clock} accent="amber" />
        )}
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
                <div className="divide-y divide-border">
                  {pipeline.map(s => (
                    <SaleRow key={s.id} sale={s} displayValue={getSaleValue(s)} showRep={isAdmin}
                      repPay={isAdmin && TOTAL_STACK[s.plan] ? (isRepAdmin(s.rep_email) ? calcAdminPay(s.plan) : calcRepPay(s.plan, getRepTier(s.rep_email))) : null}
                      override={isAdmin && TOTAL_STACK[s.plan] && !isRepAdmin(s.rep_email) ? calcAdminOverride(s.plan, getRepTier(s.rep_email)) : null}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="awaiting">
          <Card>
            {isAdmin && awaiting.length > 0 && (
              <CardHeader className="pb-2 pt-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Your 80% now: <span className="font-semibold text-foreground">${awaitingImmediate.toLocaleString()}</span></span>
                  <span className="text-muted-foreground">20% in 3 months: <span className="font-semibold text-amber-500">${awaitingDeferred.toLocaleString()}</span></span>
                </div>
              </CardHeader>
            )}
            <CardContent className="pt-4">
              {awaiting.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No sales awaiting payout</p>
              ) : (
                <div className="divide-y divide-border">
                  {awaiting.map(s => {
                    const adminVal = getAdminSaleValue(s);
                    const immediate = isAdmin ? Math.round(adminVal * 0.8) : null;
                    const deferred = isAdmin ? Math.round(adminVal * 0.2) : null;
                    return (
                      <div key={s.id}>
                        <SaleRow sale={s} displayValue={getSaleValue(s)} showRep={isAdmin}
                          repPay={isAdmin && TOTAL_STACK[s.plan] ? (isRepAdmin(s.rep_email) ? calcAdminPay(s.plan) : calcRepPay(s.plan, getRepTier(s.rep_email))) : null}
                          override={isAdmin && TOTAL_STACK[s.plan] && !isRepAdmin(s.rep_email) ? calcAdminOverride(s.plan, getRepTier(s.rep_email)) : null}
                        />
                        {isAdmin && (
                          <div className="flex gap-4 px-4 pb-2 text-xs text-muted-foreground">
                            <span>Your pay: <span className="font-semibold text-foreground">${immediate.toLocaleString()} now</span></span>
                            <span className="text-amber-500 font-medium">+ ${deferred.toLocaleString()} in 3 months</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                <div className="divide-y divide-border">
                  {paid.map(s => {
                    const rawOverride = isAdmin && TOTAL_STACK[s.plan] && !isRepAdmin(s.rep_email) ? calcAdminOverride(s.plan, getRepTier(s.rep_email)) : null;
                    return (
                      <SaleRow key={s.id} sale={s} displayValue={isAdmin ? Math.round(getSaleValue(s) * 0.8) : getSaleValue(s)} showRep={isAdmin}
                        repPay={isAdmin && TOTAL_STACK[s.plan] ? (isRepAdmin(s.rep_email) ? calcAdminPay(s.plan) : calcRepPay(s.plan, getRepTier(s.rep_email))) : null}
                        override={rawOverride !== null ? Math.round(rawOverride * 0.8) : null}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isAdmin ? 'Admin Pay Stack' : 'Commission Rate Sheet'}</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-semibold mb-2">Plans</h4>
              <div className="space-y-1 mb-4">
                {isAdmin ? (
                  Object.entries(TOTAL_STACK).map(([plan, stack]) => (
                    <div key={plan} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{plan}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Total Stack</span>
                        <span className="text-sm font-bold text-accent">${stack}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  plans.map(p => {
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
                  })
                )}
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