import React from 'react';
import { Wifi, WifiOff, User, HelpCircle } from 'lucide-react';

const FIBER_CONFIG = {
  available:          { label: 'Fiber Available',    color: '#15803d', bg: '#dcfce7', border: '#86efac', icon: Wifi },
  not_available:      { label: 'No Fiber',           color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: WifiOff },
  under_construction: { label: 'Under Construction', color: '#92400e', bg: '#fef3c7', border: '#fcd34d', icon: Wifi },
  planned:            { label: 'Planned',            color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: Wifi },
  unknown:            { label: 'Unknown',            color: '#374151', bg: '#f3f4f6', border: '#d1d5db', icon: HelpCircle },
};

export default function AddressResultCard({ address, fiberStatus = 'unknown', isCustomer = false, customerName, repName, status }) {
  const cfg = FIBER_CONFIG[fiberStatus] || FIBER_CONFIG.unknown;
  const Icon = cfg.icon;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }} className="rounded-xl px-3 py-2.5 flex items-start gap-2.5">
      <Icon style={{ color: cfg.color }} className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>{address}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
          {isCustomer && (
            <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <User className="h-2.5 w-2.5" /> {customerName || 'Customer'}
            </span>
          )}
          {repName && <span className="text-xs" style={{ color: '#374151' }}>Rep: {repName}</span>}
          {status && status !== 'lead' && (
            <span className="text-xs capitalize" style={{ color: '#374151' }}>{status.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>
    </div>
  );
}