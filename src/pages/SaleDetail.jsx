import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, CalendarDays, DollarSign, Package, FileText } from 'lucide-react';
import { TOTAL_STACK, calcAdminPay, calcRepPay } from '@/lib/commissionData';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  installed: 'bg-accent/10 text-accent border-accent/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function SaleDetail() {
  const params = new URLSearchParams(window.location.search);
  const saleId = window.location.pathname.split('/sale/')[1];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: repTiers = [] } = useQuery({
    queryKey: ['repTiers'],
    queryFn: () => base44.entities.RepTier.list(),
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const sales = await base44.entities.Sale.filter({ id: saleId });
      return sales[0];
    },
    enabled: !!saleId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sale.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  if (isLoading || !sale) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const canEditStatus = isAdmin || sale.rep_email === user?.email;

  // Recalculate correct commission based on rep's role
  const getDisplayCommission = () => {
    if (!sale) return 0;
    if (!TOTAL_STACK[sale.plan]) return sale.commission_amount || 0;
    if (isAdmin) {
      const repUser = users.find(u => u.email === sale.rep_email);
      const repIsAdmin = repUser?.role === 'admin';
      if (repIsAdmin) return calcAdminPay(sale.plan);
      const tier = repTiers.find(t => t.rep_email === sale.rep_email)?.tier ?? 0;
      return calcRepPay(sale.plan, tier);
    }
    // For reps viewing their own sale: check if they're admin
    if (user?.role === 'admin') return calcAdminPay(sale.plan);
    return sale.commission_amount || 0;
  };
  const displayCommission = getDisplayCommission();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{sale.customer_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{sale.btn}</p>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${statusColors[sale.status]}`}>
          {sale.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rep</p>
                <p className="text-sm font-medium">{sale.rep_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium">{sale.plan}</p>
              </div>
            </div>
            {sale.add_ons?.length > 0 && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Add-Ons</p>
                  <p className="text-sm font-medium">{sale.add_ons.join(', ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sale Date</p>
                <p className="text-sm font-medium">{format(new Date(sale.sale_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Install Date</p>
                <p className="text-sm font-medium">{format(new Date(sale.install_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Monthly / Commission</p>
                <p className="text-sm font-medium">
                  ${sale.monthly_bill?.toFixed(2)} / <span className="text-accent font-bold">${displayCommission.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sale.notes && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{sale.notes}</p>
          </CardContent>
        </Card>
      )}

      {canEditStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Update Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={sale.status}
              onValueChange={(v) => updateMutation.mutate({ id: sale.id, data: { status: v } })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="installed">Installed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Button
                variant={sale.paid ? "outline" : "default"}
                className={sale.paid ? "border-accent text-accent" : "bg-accent hover:bg-accent/90"}
                onClick={() => updateMutation.mutate({ id: sale.id, data: { paid: !sale.paid } })}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {sale.paid ? 'Marked as Paid ✓' : 'Mark as Paid'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}