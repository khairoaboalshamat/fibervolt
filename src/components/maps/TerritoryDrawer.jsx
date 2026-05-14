import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';

const TERRITORY_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7'
];

export default function TerritoryDrawer({ draftPoints, onSave, onCancel, users, isLoading }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TERRITORY_COLORS[0]);
  const [repEmail, setRepEmail] = useState('');

  useEffect(() => {
    setName('');
    setColor(TERRITORY_COLORS[0]);
    setRepEmail('');
  }, [draftPoints.length === 0]);

  if (draftPoints.length === 0) return null;

  const reps = users?.filter(u => u.role !== 'admin') || [];

  const handleSave = () => {
    if (!name.trim()) return;
    const rep = users?.find(u => u.email === repEmail);
    onSave({
      name: name.trim(),
      color,
      coordinates: draftPoints,
      assigned_rep_email: repEmail || null,
      assigned_rep_name: rep?.full_name || repEmail || null,
      status: 'active',
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="territory-drawer"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-[1000] bg-card rounded-t-2xl shadow-2xl border-t border-border"
        style={{ maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Drawing Territory</p>
            <p className="font-bold text-base">{draftPoints.length} points</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Territory Name
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. North District"
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {TERRITORY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: color === c ? '#fff' : 'transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Assign Rep (Optional)
            </label>
            <Select value={repEmail} onValueChange={setRepEmail}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select rep" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Unassigned</SelectItem>
                {reps.map(r => (
                  <SelectItem key={r.email} value={r.email}>
                    {r.full_name || r.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1 h-10" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1 h-10" onClick={handleSave} disabled={!name.trim() || isLoading}>
            <Save className="h-4 w-4 mr-2" /> Save Territory
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}