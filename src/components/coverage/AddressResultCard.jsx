import React from 'react';
import { Wifi, WifiOff, User, HelpCircle } from 'lucide-react';

const FIBER_CONFIG = {
  available: { label: 'Fiber Available', color: '#15803d', bg: '#f0fdf4', border: '#86efac', Icon: Wifi },
  not_available: { label: 'No Fiber', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', Icon: WifiOff },
  unknown: { label: 'Unknown', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', Icon: HelpCircle },
  under_construction: { label: 'Under Construction', color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: HelpCircle },
  planned: { label: 'Planned', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', Icon: HelpCircle },
};

export default function AddressResultCard({ address, fiberStatus, isCustomer, customerName, repName, status }) {
  const cfg = FIBER_CONFIG[fiberStatus] || FIBER_CONFIG.unknown;
  const StatusIcon = cfg.Icon;

  return (
    <div className="rounded-xl border p-3 space-y-1.5" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug" style={{ color: '#111827' }}>{address}</p>
        <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs" style={{ color: '#6b7280' }}>
        {isCustomer && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <User className="h-3 w-3" /> {customerName || 'Existing Customer'}
          </span>
        )}
        {repName && <span>Rep: {repName}</span>}
        {status && <span>Status: {status.replace(/_/g, ' ')}</span>}
      </div>
    </div>
  );
}