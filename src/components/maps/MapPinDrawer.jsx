import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Phone, Mail, User, MapPin, Calendar, Wifi, ChevronDown } from 'lucide-react';
import { PIN_STATUSES, FIBER_STATUSES } from './PinStatusBadge';

export default function MapPinDrawer({ pin, isNew, onSave, onDelete, onClose }) {
  const [status, setStatus] = useState('knocked');
  const [notes, setNotes] = useState('');
  const [customer_name, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fiber_status, setFiberStatus] = useState('unknown');
  const [follow_up_date, setFollowUpDate] = useState('');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (pin) {
      setStatus(pin.status || 'knocked');
      setNotes(pin.notes || '');
      setCustomerName(pin.customer_name || '');
      setPhone(pin.phone || '');
      setEmail(pin.email || '');
      setFiberStatus(pin.fiber_status || 'unknown');
      setFollowUpDate(pin.follow_up_date || '');
      setShowMore(!!(pin.customer_name || pin.phone || pin.email));
    }
  }, [pin?.id, pin?.lat, pin?.lng]);

  if (!pin) return null;

  const currentStatus = PIN_STATUSES.find(s => s.value === status);

  const handleSave = () => {
    onSave({ ...pin, status, notes, customer_name, phone, email, fiber_status, follow_up_date });
  };

  return (
    <AnimatePresence>
      <motion.div
        key={pin?.id || 'new'}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-[1000] bg-card rounded-t-2xl shadow-2xl border-t border-border"
        style={{ maxHeight: '75vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: currentStatus?.color }} />
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">
                {pin.address || `${pin.lat?.toFixed(5)}, ${pin.lng?.toFixed(5)}`}
              </p>
              {pin.rep_name && (
                <p className="text-xs text-muted-foreground">Rep: {pin.rep_name}</p>
              )}
              {isNew && (
                <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-0.5">New pin</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {/* Quick status selector - SalesRabbit style grid */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PIN_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs font-medium transition-all border-2 ${
                    status === s.value
                      ? 'border-transparent scale-105 shadow-md'
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  style={status === s.value ? { background: s.color + '22', color: s.color, borderColor: s.color + '66' } : {}}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</p>
            <Textarea
              placeholder="Add notes about this door..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm resize-none h-16"
            />
          </div>

          {/* Customer details toggle */}
          <button
            className="flex items-center gap-1 text-xs font-semibold text-primary w-full"
            onClick={() => setShowMore(v => !v)}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Hide customer info' : 'Add customer info'}
          </button>

          {showMore && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input value={customer_name} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="h-8 text-sm" type="tel" />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="h-8 text-sm" type="email" />
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select value={fiber_status} onValueChange={setFiberStatus}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input type="date" value={follow_up_date} onChange={e => setFollowUpDate(e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="px-4 pb-6 pt-3 border-t border-border flex gap-2">
          <Button className="flex-1 h-10 font-semibold" onClick={handleSave}>
            {isNew ? 'Save Pin' : 'Update Pin'}
          </Button>
          {pin.id && (
            <Button variant="destructive" className="h-10 px-4" onClick={() => onDelete(pin.id)}>
              Remove
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}