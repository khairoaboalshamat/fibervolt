import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PIN_STATUSES, FIBER_STATUSES } from './PinStatusBadge';
import { Phone, Mail, User, Wifi, Calendar, MapPin } from 'lucide-react';

export default function PinPopup({ pin, onSave, onDelete, onClose }) {
  const [status, setStatus] = useState(pin.status || 'lead');
  const [notes, setNotes] = useState(pin.notes || '');
  const [customer_name, setCustomerName] = useState(pin.customer_name || '');
  const [phone, setPhone] = useState(pin.phone || '');
  const [email, setEmail] = useState(pin.email || '');
  const [fiber_status, setFiberStatus] = useState(pin.fiber_status || 'unknown');
  const [follow_up_date, setFollowUpDate] = useState(pin.follow_up_date || '');
  const [expanded, setExpanded] = useState(false);

  const statusConfig = PIN_STATUSES.find(s => s.value === status);

  const handleSave = () => {
    onSave({ ...pin, status, notes, customer_name, phone, email, fiber_status, follow_up_date });
  };

  return (
    <div className="p-1 space-y-2" style={{ minWidth: 240, maxWidth: 280 }}>
      {/* Address */}
      <div className="flex items-start gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs font-semibold leading-snug">
          {pin.address || `${pin.lat?.toFixed(5)}, ${pin.lng?.toFixed(5)}`}
        </p>
      </div>

      {/* Status */}
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-8 text-xs" style={{ borderColor: statusConfig?.color + '66' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusConfig?.color }} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {PIN_STATUSES.map(s => (
            <SelectItem key={s.value} value={s.value}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Customer info (collapsible) */}
      <button
        className="text-xs text-primary underline-offset-2 hover:underline w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? '▾ Hide details' : '▸ Add customer details'}
      </button>

      {expanded && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              value={customer_name}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-muted-foreground shrink-0" />
            <Select value={fiber_status} onValueChange={setFiberStatus}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Fiber status" />
              </SelectTrigger>
              <SelectContent>
                {FIBER_STATUSES.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                      {f.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(status === 'follow_up' || status === 'callback') && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={follow_up_date}
                onChange={e => setFollowUpDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-xs h-14 resize-none"
      />

      {/* Rep + timestamp */}
      {pin.rep_name && (
        <p className="text-xs text-muted-foreground">Rep: {pin.rep_name}</p>
      )}

      {/* Actions */}
      <div className="flex gap-1.5">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave}>Save</Button>
        {pin.id && (
          <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => onDelete(pin.id)}>Del</Button>
        )}
        {!pin.id && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={onClose}>✕</Button>
        )}
      </div>
    </div>
  );
}