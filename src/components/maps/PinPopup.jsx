import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PIN_STATUSES } from './PinStatusBadge';

export default function PinPopup({ pin, onSave, onDelete, onClose }) {
  const [status, setStatus] = useState(pin.status || 'lead');
  const [notes, setNotes] = useState(pin.notes || '');

  return (
    <div className="p-1 min-w-[220px] space-y-3">
      <p className="text-xs font-semibold truncate max-w-[200px]">{pin.address || `${pin.lat?.toFixed(4)}, ${pin.lng?.toFixed(4)}`}</p>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIN_STATUSES.map(s => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-xs h-16 resize-none"
      />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onSave({ ...pin, status, notes })}>Save</Button>
        {pin.id && (
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onDelete(pin.id)}>Del</Button>
        )}
      </div>
    </div>
  );
}