import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PullToRefresh from '@/components/PullToRefresh';
import { Activity, MapPin, DollarSign, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_CONFIG = {
  pin_created:   { label: 'Pin Dropped',    color: 'bg-blue-100 text-blue-700',   icon: MapPin },
  pin_updated:   { label: 'Pin Updated',    color: 'bg-yellow-100 text-yellow-700', icon: MapPin },
  sale_created:  { label: 'Sale Submitted', color: 'bg-green-100 text-green-700',  icon: DollarSign },
  sale_updated:  { label: 'Sale Updated',   color: 'bg-purple-100 text-purple-700', icon: DollarSign },
};

export default function ActivityFeed() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const [filterRep, setFilterRep] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity_logs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 200),
  });

  // Real-time updates
  useEffect(() => {
    const unsub = base44.entities.ActivityLog.subscribe((event) => {
      queryClient.setQueryData(['activity_logs'], (old = []) => {
        if (event.type === 'create') return [event.data, ...old].slice(0, 200);
        if (event.type === 'delete') return old.filter(l => l.id !== event.id);
        return old;
      });
    });
    return unsub;
  }, [queryClient]);

  const repEmails = [...new Set(logs.map(l => l.rep_email).filter(Boolean))];

  const filtered = logs.filter(l => {
    if (filterRep !== 'all' && l.rep_email !== filterRep) return false;
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    return true;
  });

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['activity_logs'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} isLoading={isLoading}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Activity Feed
          </h1>
          <p className="text-muted-foreground text-sm">Real-time team activity — pins, status changes, and sales.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" /> Live
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {isAdmin && (
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Reps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {repEmails.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">{filtered.length} events</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No activity yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.pin_updated;
            const Icon = cfg.icon;
            return (
              <Card key={log.id} className="p-0">
                <div className="flex items-start gap-4 p-4">
                  <div className={`rounded-full p-2 mt-0.5 shrink-0 ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.rep_name || log.rep_email}</span>
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${cfg.color} border-0`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{log.detail || '—'}</p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(log.meta).map(([k, v]) => (
                          <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded">{k}: {v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </PullToRefresh>
  );
}