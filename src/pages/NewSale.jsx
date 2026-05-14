import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { calcMonthlyBill, calcCommission, calcAdminPay, TOTAL_STACK } from '@/lib/commissionData';
import { DollarSign, FileText } from 'lucide-react';
import AddressAutocomplete from '@/components/NewSale/AddressAutocomplete';

export default function NewSale() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: () => base44.entities.CommissionRate.list()
  });
  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list()
  });

  const plans = rates.filter((r) => r.type === 'plan');
  const addons = rates.filter((r) => r.type === 'addon');

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    dob: '',
    btn: '',
    plan: '',
    add_ons: [],
    sale_date: new Date().toISOString().split('T')[0],
    install_date: '',
    notes: ''
  });

  const monthlyBill = useMemo(() =>
    form.plan ? calcMonthlyBill(form.plan, form.add_ons, plans, addons) : 0,
    [form.plan, form.add_ons, plans, addons]
  );

  const commission = useMemo(() => {
    if (!form.plan) return 0;
    if (user?.role === 'admin' && TOTAL_STACK[form.plan]) {
      const addonCommission = form.add_ons.reduce((sum, aoName) => {
        const addon = addons.find(a => a.name === aoName);
        return sum + (addon?.commission || 0);
      }, 0);
      return calcAdminPay(form.plan) + addonCommission;
    }
    return calcCommission(form.plan, form.add_ons, plans, addons, repTiers, user?.email);
  }, [form.plan, form.add_ons, plans, addons, repTiers, user?.email, user?.role]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const sale = await base44.entities.Sale.create(data);
      // Auto-create client record
      await base44.entities.Client.create({
        name: data.customer_name,
        phone: data.phone,
        address: data.address,
        plan: data.plan,
        add_ons: data.add_ons,
        install_date: data.install_date,
        status: 'active',
        rep_email: data.rep_email,
        rep_name: data.rep_name,
        notes: data.notes || '',
      });
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate('/');
    }
  });

  const handleToggleAddon = (addonName) => {
    setForm((prev) => ({
      ...prev,
      add_ons: prev.add_ons.includes(addonName) ?
        prev.add_ons.filter((a) => a !== addonName) :
        [...prev.add_ons, addonName]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      rep_email: user?.email,
      rep_name: user?.full_name || user?.email,
      monthly_bill: monthlyBill,
      commission_amount: commission
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                  placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="555-123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BTN *</Label>
                <Input
                  required
                  value={form.btn}
                  onChange={(e) => setForm((p) => ({ ...p, btn: e.target.value }))}
                  placeholder="555-123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sale Date *</Label>
                <Input
                  type="date"
                  required
                  value={form.sale_date}
                  onChange={(e) => setForm((p) => ({ ...p, sale_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Install Date *</Label>
                <Input
                  type="date"
                  required
                  value={form.install_date}
                  onChange={(e) => setForm((p) => ({ ...p, install_date: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Plan & Add-Ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plan *</Label>
              <Select value={form.plan} onValueChange={(v) => setForm((p) => ({ ...p, plan: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) =>
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} — ${p.monthly_price}/mo
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Add-Ons</Label>
              {addons.map((a) =>
                <div key={a.name} className="flex items-center gap-3">
                  <Checkbox
                    checked={form.add_ons.includes(a.name)}
                    onCheckedChange={() => handleToggleAddon(a.name)}
                    id={`addon-${a.name}`} />
                  <label htmlFor={`addon-${a.name}`} className="text-sm cursor-pointer flex-1">
                    {a.name}
                    <span className="text-muted-foreground ml-1">(+${a.monthly_price}/mo)</span>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar text-sidebar-foreground">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-sidebar-foreground/60">Monthly Bill</p>
                <p className="text-xl font-bold text-white">${monthlyBill.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-sidebar-foreground/60">Expected Commission</p>
                <p className="text-xl font-bold text-accent">${commission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={!form.customer_name || !form.btn || !form.plan || !form.install_date || createMutation.isPending}>
          <DollarSign className="h-5 w-5 mr-2" />
          {createMutation.isPending ? 'Submitting...' : 'Submit Sale'}
        </Button>
      </form>
    </div>
  );
}