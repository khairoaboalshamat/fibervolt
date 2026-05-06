import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { UserPlus, Shield, DollarSign, Zap } from 'lucide-react';
import { TOTAL_STACK, calcRepPay } from '@/lib/commissionData';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  installed: 'bg-accent/10 text-accent border-accent/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Admin() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: () => base44.entities.Sale.list('-created_date', 500) });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const { data: boosts = [] } = useQuery({ queryKey: ['boosts'], queryFn: () => base44.entities.RepBoost.list() });
  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: () => base44.entities.CommissionRate.list() });

  const plans = rates.filter(r => r.type === 'plan');

  // Count installed deals per rep for tier calculation
  const repDealCounts = {};
  sales.forEach(s => {
    if (s.status === 'installed' && s.rep_email) {
      repDealCounts[s.rep_email] = (repDealCounts[s.rep_email] || 0) + 1;
    }
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteOpen, setInviteOpen] = useState(false);

  const [boostEmail, setBoostEmail] = useState('');
  const [boostPlan, setBoostPlan] = useState('');
  const [boostAmount, setBoostAmount] = useState('');
  const [boostOpen, setBoostOpen] = useState(false);

  const updateSale = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sale.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });

  const createBoost = useMutation({
    mutationFn: (data) => base44.entities.RepBoost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boosts'] });
      setBoostOpen(false);
      setBoostEmail('');
      setBoostPlan('');
      setBoostAmount('');
    },
  });

  const deleteBoost = useMutation({
    mutationFn: (id) => base44.entities.RepBoost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boosts'] }),
  });

  const handleInvite = async () => {
    await base44.users.inviteUser(inviteEmail, inviteRole);
    toast.success(`Invited ${inviteEmail} as ${inviteRole === 'admin' ? 'Admin' : 'Rep'}`);
    setInviteOpen(false);
    setInviteEmail('');
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  if (user?.role !== 'admin') {
    return <p className="text-center text-muted-foreground py-12">Admin access required</p>;
  }

  const reps = users.filter(u => u.email !== user?.email);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Admin Panel
        </h1>
        <div className="flex gap-2">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Add Rep</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Rep</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="rep@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Rep</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={!inviteEmail}>Send Invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={boostOpen} onOpenChange={setBoostOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Zap className="h-4 w-4 mr-2" /> Add Boost</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Commission Boost</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rep</Label>
                  <Select value={boostEmail} onValueChange={setBoostEmail}>
                    <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
                    <SelectContent>
                      {reps.map(r => (
                        <SelectItem key={r.email} value={r.email}>{r.full_name || r.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={boostPlan} onValueChange={setBoostPlan}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Boost Amount ($)</Label>
                  <Input type="number" value={boostAmount} onChange={e => setBoostAmount(e.target.value)} placeholder="25" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createBoost.mutate({ rep_email: boostEmail, plan: boostPlan, boost_amount: parseFloat(boostAmount) })}
                  disabled={!boostEmail || !boostPlan || !boostAmount}>
                  Save Boost
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">All Sales ({sales.length})</TabsTrigger>
          <TabsTrigger value="reps">Reps ({reps.length})</TabsTrigger>
          <TabsTrigger value="boosts">Boosts ({boosts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Rep</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Install</th>
                      <th className="pb-3 font-medium">Rep Pay</th>
                      <th className="pb-3 font-medium">Override</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sales.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="py-3">
                          <Link to={`/sale/${s.id}`} className="font-medium hover:text-primary transition-colors">
                            {s.customer_name}
                          </Link>
                        </td>
                        <td className="py-3 text-muted-foreground">{s.rep_name}</td>
                        <td className="py-3">{s.plan}</td>
                        <td className="py-3 text-muted-foreground">
                          {s.install_date ? format(new Date(s.install_date), 'MMM d') : '—'}
                        </td>
                        <td className="py-3 font-semibold text-amber-500">
                          ${TOTAL_STACK[s.plan] ? calcRepPay(s.plan, repDealCounts[s.rep_email] || 0) : (s.commission_amount || 0)}
                        </td>
                        <td className="py-3 font-semibold text-accent">
                          {TOTAL_STACK[s.plan] ? `$${TOTAL_STACK[s.plan] - calcRepPay(s.plan, repDealCounts[s.rep_email] || 0)}` : '—'}
                        </td>
                        <td className="py-3">
                          <Select value={s.status} onValueChange={v => updateSale.mutate({ id: s.id, data: { status: v } })}>
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="installed">Installed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={s.paid ? 'text-accent' : 'text-muted-foreground'}
                            onClick={() => updateSale.mutate({ id: s.id, data: { paid: !s.paid } })}
                          >
                            <DollarSign className="h-4 w-4" />
                            {s.paid ? 'Paid' : 'Unpaid'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reps">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {reps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No reps yet. Invite one above.</p>
              ) : (
                reps.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{r.full_name || r.email}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <Badge variant="outline">{r.role}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boosts">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {boosts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No boosts configured</p>
              ) : (
                boosts.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{b.rep_email}</p>
                      <p className="text-xs text-muted-foreground">{b.plan} plan</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-accent/10 text-accent border-accent/20">+${b.boost_amount}</Badge>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteBoost.mutate(b.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}