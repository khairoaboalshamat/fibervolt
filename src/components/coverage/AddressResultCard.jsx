import React from 'react';
import { Wifi, WifiOff, CheckCircle2, XCircle, User, MapPin } from 'lucide-react';

const FIBER_COLORS = {
  available: { label: 'Fiber Available', color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  not_available: { label: 'No Fiber', color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  under_construction: { label: 'Under Construction', color: 'bg-yellow-500', textColor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  planned: { label: 'Planned', color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  unknown: { label: 'Unknown', color: 'bg-gray-400', textColor: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

const STATUS_LABELS = {
  sale: 'Customer', installed: 'Installed', interested: 'Interested',
  follow_up: 'Follow Up', not_interested: 'Not Interested', knocked: 'Knocked',
  no_answer: 'No Answer', lead: 'Lead', callback: 'Callback',
  already_customer: 'Existing Customer', cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  sale: 'bg-green-500', installed: 'bg-emerald-600', interested: 'bg-blue-500',
  follow_up: 'bg-yellow-500', not_interested: 'bg-red-500', knocked: 'bg-purple-500',
  no_answer: 'bg-gray-400', lead: 'bg-slate-400', callback: 'bg-orange-500',
  already_customer: 'bg-teal-500', cancelled: 'bg-rose-600',
};

export default function AddressResultCard({ address, pin, client }) {
  const fiberStatus = pin?.fiber_status || 'unknown';
  const fiber = FIBER_COLORS[fiberStatus];
  const isCustomer = pin?.status === 'sale' || pin?.status === 'installed' || pin?.status === 'already_customer' || !!client;
  const hasFiber = fiberStatus === 'available';
  const statusColor = STATUS_COLORS[pin?.status] || 'bg-slate-400';
  const statusLabel = STATUS_LABELS[pin?.status] || 'Not in System';

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${fiber.bg}`}>
      <div className="flex items-start gap-3">
        <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${fiber.textColor}`} />
        <p className="font-semibold text-sm leading-snug">{address}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Fiber status */}
        <div className="bg-white/70 rounded-lg p-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">Frontier Fiber</p>
          <div className={`flex items-center gap-1.5 font-semibold text-sm ${fiber.textColor}`}>
            {hasFiber ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {fiber.label}
          </div>
        </div>

        {/* Service status */}
        <div className="bg-white/70 rounded-lg p-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">Service Status</p>
          {isCustomer ? (
            <div className="flex items-center gap-1.5 font-semibold text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Has Service
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-500">
              <XCircle className="h-4 w-4" /> No Service
            </div>
          )}
        </div>
      </div>

      {pin ? (
        <div className="bg-white/70 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Pin Status</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${statusColor}`}>{statusLabel}</span>
          </div>
          {pin.customer_name && <p className="text-sm flex items-center gap-1"><User className="h-3 w-3" /> {pin.customer_name}</p>}
          {pin.phone && <p className="text-xs text-muted-foreground">📞 {pin.phone}</p>}
          {pin.rep_name && <p className="text-xs text-muted-foreground">Rep: {pin.rep_name}</p>}
          {pin.notes && <p className="text-xs text-muted-foreground italic">{pin.notes}</p>}
        </div>
      ) : (
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Not in system — no pin or customer record found</p>
        </div>
      )}

      {client && (
        <div className="bg-white/70 rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Client Record</p>
          <p className="text-sm font-semibold">{client.name}</p>
          {client.plan && <p className="text-xs text-muted-foreground">Plan: {client.plan}</p>}
          {client.status && <p className="text-xs text-muted-foreground">Status: {client.status}</p>}
        </div>
      )}

      {!isCustomer && hasFiber && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-orange-700">🎯 Sales Opportunity — Fiber available, no active service!</p>
        </div>
      )}
    </div>
  );
}