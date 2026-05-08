import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Plus, Search, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  active:    'bg-accent/10 text-accent border-accent/20',
  inactive:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const EMPTY = { name: '', email: '', phone: '', address: '', plan: '', add_ons: [], status: 'active', install_date: '', notes: '' };

export default function Clients() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
  });

  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const create = useMutation({
    mutationFn: (d) => base44.entities.Client.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setOpen(false); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setOpen(false); },
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm(c); setOpen(true); };

  const handleSubmit = () => {
    const data = { ...form, rep_email: editing?.rep_email || user?.email, rep_name: editing?.rep_name || user?.full_name || user?.email };
    editing ? update.mutate({ id: editing.id, data }) : create.mutate(data);
  };

  const visible = useMemo(() => clients.filter(c => {
    if (!isAdmin && c.rep_email !== user?.email) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.address || '').toLowerCase().includes(q);
    }
    return true;
  }), [clients, isAdmin, user, statusFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Clients
          </h1>
          <p className="text-muted-foreground text-sm">{visible.length} client{visible.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No clients found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(c)}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold truncate">{c.name}</p>
                  <Badge variant="outline" className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                </div>
                {c.plan && <p className="text-sm text-muted-foreground">Plan: <span className="text-foreground font-medium">{c.plan}</span></p>}
                {c.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </p>
                )}
                {c.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {c.address}
                  </p>
                )}
                {c.install_date && <p className="text-xs text-muted-foreground">Installed: {format(new Date(c.install_date), 'MMM d, yyyy')}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="555-123-4567" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@email.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Input value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} placeholder="7G" />
            </div>
            <div className="space-y-1.5">
              <Label>Install Date</Label>
              <Input type="date" value={form.install_date} onChange={e => setForm(p => ({ ...p, install_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button variant="destructive" onClick={() => { remove.mutate(editing.id); setOpen(false); }}>Delete</Button>
            )}
            <Button onClick={handleSubmit} disabled={!form.name}>{editing ? 'Save Changes' : 'Add Client'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}