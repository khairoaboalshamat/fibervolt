import React from 'react';
import { Wifi, WifiOff, User, HelpCircle } from 'lucide-react';

const FIBER_CONFIG = {
  available:          { label: 'Fiber Available',       color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  icon: Wifi },
  not_available:      { label: 'No Fiber',              color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    icon: WifiOff },
  under_construction: { label: 'Under Construction',    color: 'text-yellow-800', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: Wifi },
  planned:            { label: 'Planned',               color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: Wifi },
  unknown:            { label: 'Unknown',               color: 'text-slate-700',  bg: 'bg-slate-100',  border: 'border-slate-300',  icon: HelpCircle },
};

export default function AddressResultCard({ address, fiberStatus = 'unknown', isCustomer = false, customerName, repName, status }) {
  const cfg = FIBER_CONFIG[fiberStatus] || FIBER_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-3 py-2.5 flex items-start gap-2.5`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{address}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          {isCustomer && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <User className="h-2.5 w-2.5" /> {customerName || 'Customer'}
            </span>
          )}
          {repName && <span className="text-xs text-muted-foreground">Rep: {repName}</span>}
          {status && status !== 'lead' && (
            <span className="text-xs text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>
    </div>
  );
}