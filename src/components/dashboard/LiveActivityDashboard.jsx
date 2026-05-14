import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, RefreshCw, Zap, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const ACTION_CONFIG = {
  pin_created:  { label: 'Pin Dropped',     bg: 'bg-blue-500/10',   text: 'text-blue-600',   ring: 'ring-blue-500/30',  dot: '#3b82f6', Icon: MapPin },
  pin_updated:  { label: 'Status Changed',  bg: 'bg-amber-500/10',  text: 'text-amber-600',  ring: 'ring-amber-500/30', dot: '#f59e0b', Icon: MapPin },
  sale_created: { label: 'Sale Closed',     bg: 'bg-green-500/10',  text: 'text-green-600',  ring: 'ring-green-500/30', dot: '#22c55e', Icon: DollarSign },
  sale_updated: { label: 'Sale Updated',    bg: 'bg-purple-500/10', text: 'text-purple-600', ring: 'ring-purple-500/30',dot: '#a855f7', Icon: DollarSign },
};

function PulseDot({ color }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: color }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  );
}

function ActivityRow({ log, isNew }) {
  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.pin_updated;
  const { Icon } = cfg;
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(log.created_date), { addSuffix: true }); }
    catch { return ''; }
  })();

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -12, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border border-transparent transition-colors ${isNew ? 'bg-primary/5 border-primary/10' : 'hover:bg-muted/40'}`}
    >
      <div className={`shrink-0 rounded-lg p-2 ${cfg.bg} ring-1 ${cfg.ring} mt-0.5`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground leading-tight">
            {log.rep_name || log.rep_email?.split('@')[0] || 'Rep'}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
          {isNew && <PulseDot color={cfg.dot} />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail || '—'}</p>
        {log.meta?.plan && (
          <span className="inline-block mt-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
            {log.meta.plan}
          </span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 mt-1 whitespace-nowrap">{timeAgo}</span>
    </motion.div>
  );
}

function SummaryBadge({ count, label, color }) {
  return (
    <div className="flex flex-col items-center justify-center bg-muted/50 rounded-xl px-3 py-2 min-w-[64px]">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight text-center">{label}</span>
    </div>
  );
}

export default function LiveActivityDashboard({ maxItems = 20 }) {
  const queryClient = useQueryClient();
  const [newIds, setNewIds] = useState(new Set());
  const isFirstLoad = useRef(true);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity_logs_live'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 100),
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.ActivityLog.subscribe((event) => {
      queryClient.setQueryData(['activity_logs_live'], (old = []) => {
        if (event.type === 'create') {
          setNewIds(prev => new Set([...prev, event.data.id]));
          setTimeout(() => setNewIds(prev => { const next = new Set(prev); next.delete(event.data.id); return next; }), 5000);
          return [event.data, ...old].slice(0, 100);
        }
        if (event.type === 'delete') return old.filter(l => l.id !== event.id);
        return old;
      });
    });
    return unsub;
  }, [queryClient]);

  // Clear "new" highlights after first data load
  useEffect(() => {
    if (logs.length > 0 && isFirstLoad.current) {
      isFirstLoad.current = false;
    }
  }, [logs]);

  const visible = logs.slice(0, maxItems);

  // Summary counters (last 24 hours)
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const recent = logs.filter(l => new Date(l.created_date).getTime() > since24h);
  const counts = {
    pins:    recent.filter(l => l.action === 'pin_created').length,
    changes: recent.filter(l => l.action === 'pin_updated').length,
    sales:   recent.filter(l => l.action === 'sale_created').length,
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Live Activity</CardTitle>
            <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-500/10 rounded-full px-2 py-0.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <Link to="/activity" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 24h Summary */}
        <div className="flex gap-2 mt-3">
          <SummaryBadge count={counts.pins}    label="Pins dropped"   color="text-blue-600" />
          <SummaryBadge count={counts.changes} label="Status changes" color="text-amber-600" />
          <SummaryBadge count={counts.sales}   label="Sales closed"   color="text-green-600" />
          <div className="flex flex-col items-center justify-center bg-muted/50 rounded-xl px-3 py-2 min-w-[64px]">
            <span className="text-xl font-bold tabular-nums text-foreground">{recent.length}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight text-center">Total (24h)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-2 pb-3 min-h-0 max-h-[480px] space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 mx-auto mb-2 opacity-40" />
            No activity yet. Get in the field!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map(log => (
              <ActivityRow key={log.id} log={log} isNew={newIds.has(log.id)} />
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}