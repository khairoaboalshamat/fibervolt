import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  installed: 'bg-accent/10 text-accent border-accent/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function SaleRow({ sale, displayValue, showRep, repPay, override }) {
  const value = displayValue !== undefined ? displayValue : (sale.commission_amount || 0);
  return (
    <Link
      to={`/sale/${sale.id}`}
      className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
          {sale.customer_name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {showRep && sale.rep_name ? `${sale.rep_name} · ` : ''}{sale.plan} · {sale.install_date ? format(new Date(sale.install_date), 'MMM d') : '—'}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-3">
        <div className="text-right">
          <p className="text-sm font-semibold">${value}</p>
          {repPay !== null && repPay !== undefined && (
            <p className="text-xs text-muted-foreground">
              Rep: <span className="text-amber-500">${repPay}</span>
              {override !== null && override !== undefined && (
                <> · Override: <span className="text-accent">${override}</span></>
              )}
            </p>
          )}
        </div>
        <Badge variant="outline" className={`text-xs ${statusColors[sale.status] || ''}`}>
          {sale.status}
        </Badge>
      </div>
    </Link>
  );
}