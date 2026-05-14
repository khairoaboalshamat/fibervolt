import React, { useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

function repIcon(initials) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#6366f1;border:2px solid white;box-shadow:0 0 0 3px rgba(99,102,241,0.35);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;font-family:system-ui">${initials}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function isStale(lastSeen) {
  if (!lastSeen) return true;
  return Date.now() - new Date(lastSeen).getTime() > 10 * 60 * 1000; // 10 min
}

export default function LiveRepDots({ currentUserEmail }) {
  const queryClient = useQueryClient();

  const { data: repLocations = [] } = useQuery({
    queryKey: ['repLocations'],
    queryFn: () => base44.entities.RepLocation.list('-last_seen', 200),
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.RepLocation.subscribe((event) => {
      queryClient.setQueryData(['repLocations'], (old = []) => {
        if (event.type === 'create') return [...old, event.data];
        if (event.type === 'update') return old.map(r => r.id === event.id ? event.data : r);
        if (event.type === 'delete') return old.filter(r => r.id !== event.id);
        return old;
      });
    });
    return unsub;
  }, [queryClient]);

  // Only show other reps, and not stale ones
  const others = repLocations.filter(r => r.rep_email !== currentUserEmail && !isStale(r.last_seen));

  return others.map(rep => (
    <Marker
      key={rep.id}
      position={[rep.lat, rep.lng]}
      icon={repIcon(getInitials(rep.rep_name))}
    >
      <Popup>
        <div className="text-sm space-y-0.5">
          <p className="font-semibold">{rep.rep_name || rep.rep_email}</p>
          <p className="text-xs text-muted-foreground">
            Last seen: {rep.last_seen ? formatDistanceToNow(new Date(rep.last_seen), { addSuffix: true }) : 'unknown'}
          </p>
        </div>
      </Popup>
    </Marker>
  ));
}